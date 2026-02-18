import { supabase } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { getOrCreateExamBuilderStore } from "@/lib/store/useExamBuilderStore";
import {
  ExamWhileBuilding,
  ExamSegmentWhileBuilding,
  QuestionWhileBuilding,
} from "@/features/db-ts/objects";

// Re-define payload here since it was in the deleted file
export interface RealtimePayload {
  exam?: Partial<ExamWhileBuilding>;
  segments?: Partial<ExamSegmentWhileBuilding>[];
  questions?: QuestionWhileBuilding[];
  assignedGroupIds?: string[];
  deletedQuestionIds?: string[];
  deletedSegmentIds?: string[];
  senderId: string;
}

// Extended Payload for Multiplexing
export interface MultiplexedPayload extends RealtimePayload {
  examId: string;
}

interface PresenceState {
  user_id: string;
  joined_at: string;
  senderId: string;
}

export class OrgRealtimeManager {
  private orgId: string;
  private channel: RealtimeChannel | null = null;
  public senderId: string;

  // Backup Saver State
  private pendingRemoteChanges = new Map<string, MultiplexedPayload>();
  private backupTimers = new Map<string, NodeJS.Timeout>();
  private isLeader = false;

  constructor(orgId: string) {
    this.orgId = orgId;
    this.senderId = crypto.randomUUID();
  }

  public getOrgId() {
    return this.orgId;
  }

  public connect() {
    if (this.channel) return;
    console.log(
      `OrgHub: Connecting to private:org:${this.orgId} with senderId ${this.senderId}`,
    );

    this.channel = supabase.channel(`private:org:${this.orgId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: this.orgId },
        private: true,
      },
    });

    this.channel
      .on(
        "broadcast",
        { event: "exam_change" },
        ({ payload }: { payload: MultiplexedPayload }) => {
          if (payload.senderId === this.senderId) return;

          console.log(`OrgHub: Received change for exam ${payload.examId}`, payload);
          const store = getOrCreateExamBuilderStore(payload.examId);

          // 1. Apply remote data to store (Cleanly)
          store.getState().setRemoteData(payload);

          // 2. Setup Backup Saver Timer
          const changeKey = `${payload.senderId}-${payload.examId}`;

          if (this.backupTimers.has(changeKey)) {
            clearTimeout(this.backupTimers.get(changeKey));
          }

          this.pendingRemoteChanges.set(changeKey, payload);

          const timer = setTimeout(() => {
            if (this.isLeader && this.pendingRemoteChanges.has(changeKey)) {
              console.log(`Backup Saver: Leader taking over for ${changeKey}`);
              const data = this.pendingRemoteChanges.get(changeKey);
              if (data) {
                const storeToDirty = getOrCreateExamBuilderStore(data.examId);
                storeToDirty.getState().markRemoteAsDirty(data);
              }
            }
            this.pendingRemoteChanges.delete(changeKey);
            this.backupTimers.delete(changeKey);
          }, 15000);

          this.backupTimers.set(changeKey, timer);
        },
      )
      .on(
        "broadcast",
        { event: "SAVED_CONFIRMED" },
        ({ payload }: { payload: { senderId: string; examId: string } }) => {
          const changeKey = `${payload.senderId}-${payload.examId}`;
          console.log(`OrgHub: Received SAVED_CONFIRMED for ${changeKey}`);
          if (this.backupTimers.has(changeKey)) {
            clearTimeout(this.backupTimers.get(changeKey));
            this.backupTimers.delete(changeKey);
          }
          this.pendingRemoteChanges.delete(changeKey);
        },
      )
      .on("presence", { event: "sync" }, () => {
        if (!this.channel) return;
        const state = this.channel.presenceState<PresenceState>();
        const allPresences = Object.values(state).flat();

        const sorted = allPresences.sort((a, b) => {
          const timeA = new Date(a.joined_at).getTime();
          const timeB = new Date(b.joined_at).getTime();
          if (timeA !== timeB) return timeA - timeB;
          return a.senderId.localeCompare(b.senderId); // Deterministic tie-breaker
        });

        if (sorted[0]?.senderId === this.senderId) {
          if (!this.isLeader) {
            console.log("OrgHub Presence: You are now the Backup Saver Leader.");
            this.isLeader = true;
          }
        } else {
          if (this.isLeader) {
            console.log("OrgHub Presence: You are no longer the Leader.");
          }
          this.isLeader = false;
        }
      })
      .subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`OrgHub: Connected to Organization ${this.orgId}`);
          await this.channel?.track({
            user_id: (await supabase.auth.getUser()).data.user?.id,
            joined_at: new Date().toISOString(),
            senderId: this.senderId,
          });
        }
        if (status === "CHANNEL_ERROR") {
          console.error(`OrgHub: Connection Error`, err);
        }
      });
  }

  public disconnect() {
    if (this.channel) {
      console.log(`OrgHub: Disconnecting`);
      this.backupTimers.forEach(clearTimeout);
      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  public broadcast(payload: MultiplexedPayload) {
    if (this.channel) {
      console.log(`OrgHub: Broadcasting to private:org:${this.orgId}`, payload);
      this.channel
        .send({
          type: "broadcast",
          event: "exam_change",
          payload: { ...payload, senderId: this.senderId },
        })
        .then((resp) => {
          if (resp !== "ok") console.error("OrgHub Broadcast Error:", resp);
        });
    } else {
      console.warn("OrgHub: Cannot broadcast, channel is null");
    }
  }

  public broadcastSaveConfirmed(examId: string) {
    if (this.channel) {
      console.log(`OrgHub: Broadcasting SAVED_CONFIRMED for exam ${examId}`);
      this.channel.send({
        type: "broadcast",
        event: "SAVED_CONFIRMED",
        payload: { senderId: this.senderId, examId: examId },
      });
    }
  }
}
