import { supabase } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { ExamBuilderStoreFactory } from "@/lib/store/useExamBuilderStore";
import {
  ExamWhileBuilding,
  ExamSegmentWhileBuilding,
  QuestionWhileBuilding,
} from "@/features/db-ts/objects";

// --- Types ---

export interface RealtimePayload {
  exam?: Partial<ExamWhileBuilding>;
  segments?: Partial<ExamSegmentWhileBuilding>[];
  questions?: QuestionWhileBuilding[];
  assignedGroupIds?: string[];
  deletedQuestionIds?: string[];
  deletedSegmentIds?: string[];
  // Tracks who made the change to avoid echo-loops
  senderId: string;
}

export interface MultiplexedPayload extends RealtimePayload {
  examId: string;
}

interface PresenceState {
  user_id: string;
  joined_at: string;
  senderId: string;
}

// --- The Manager ---

export class OrgRealtimeManager {
  private orgId: string;
  private channel: RealtimeChannel | null = null;
  public senderId: string;

  private retryCount = 0;
  private maxRetryDelay = 30000; // 30s

  // Backup Saver State
  // Map Key: "senderId-examId" -> The MERGED payload of pending changes
  private pendingRemoteChanges = new Map<string, MultiplexedPayload>();
  private backupTimers = new Map<string, NodeJS.Timeout>();

  private isLeader = false;
  private presences: PresenceState[] = [];

  constructor(orgId: string) {
    this.orgId = orgId;
    this.senderId = crypto.randomUUID();
  }

  public getOrgId() {
    return this.orgId;
  }

  // --- Connection Logic ---

  public connect(retry = false) {
    if (this.channel && !retry) return;

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
      // 1. Handle Incoming Data (The Sync)
      .on(
        "broadcast",
        { event: "exam_change" },
        ({ payload }: { payload: MultiplexedPayload }) => {
          this.handleIncomingChange(payload);
        },
      )
      // 2. Handle Save Confirmations (The Cleanup)
      .on(
        "broadcast",
        { event: "SAVED_CONFIRMED" },
        ({ payload }: { payload: { senderId: string; examId: string } }) => {
          this.handleSaveConfirmed(payload);
        },
      )
      // 3. Handle Presence (The Leader Election)
      .on("presence", { event: "sync" }, () => {
        this.handlePresenceSync();
      })
      .subscribe(async (status, err) => {
        if (status === "SUBSCRIBED") {
          console.log(`OrgHub: Connected to Organization ${this.orgId}`);

          // Track our presence immediately
          const user = (await supabase.auth.getUser()).data.user;
          await this.channel?.track({
            user_id: user?.id ?? "anon",
            joined_at: new Date().toISOString(),
            senderId: this.senderId,
          });
        }

        if (status === "CHANNEL_ERROR") {
          console.error(`OrgHub: Connection Error`, err);
          this.handleRetry();
          // Optional: Implement exponential backoff retry here
        }
      });
  }

  private handleRetry() {
    // Exponential backoff: 2^retry * 1000ms + random jitter
    const delay = Math.min(
      Math.pow(2, this.retryCount) * 1000 + Math.random() * 1000,
      this.maxRetryDelay,
    );

    console.warn(`OrgHub: Connection failed. Retrying in ${Math.round(delay)}ms...`);

    setTimeout(() => {
      this.retryCount++;
      this.connect();
    }, delay);
  }

  public disconnect() {
    if (this.channel) {
      console.log(`OrgHub: Disconnecting`);

      // Clear all pending backup timers to prevent "Ghost Saves"
      this.backupTimers.forEach((timer) => clearTimeout(timer));
      this.backupTimers.clear();
      this.pendingRemoteChanges.clear();

      this.channel.unsubscribe();
      this.channel = null;
    }
  }

  // --- Broadcasting ---

  public broadcast(payload: MultiplexedPayload) {
    if (this.channel) {
      // Ensure we stamp our senderId so we don't process our own echo
      const safePayload = { ...payload, senderId: this.senderId };

      // Optimistic Log
      console.log(`OrgHub: Broadcasting change`, safePayload);

      this.channel
        .send({
          type: "broadcast",
          event: "exam_change",
          payload: safePayload,
        })
        .then((resp) => {
          if (resp !== "ok") console.error("OrgHub Broadcast Error:", resp);
        });
    } else {
      console.warn("OrgHub: Cannot broadcast, channel doesn't exist or is closed.");
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

  // --- Internal Handlers (The Surgical Logic) ---

  private handleIncomingChange(payload: MultiplexedPayload) {
    if (payload.senderId === this.senderId) return;

    // A. Apply to Local Store (Instant UI Update)
    const store = ExamBuilderStoreFactory.getState().createExamBuilderStoreFactory(
      payload.examId,
    );
    store.getState().setRemoteData(payload);

    // B. Queue for Backup Save (The "Safety Net")
    const changeKey = `${payload.senderId}-${payload.examId}`;

    // 1. Merge with existing pending changes (Fixing the Overwrite Bug)
    const existing = this.pendingRemoteChanges.get(changeKey);
    const mergedPayload: MultiplexedPayload = existing
      ? {
          ...existing,
          ...payload,
          // Arrays need concatenation or smart merging, but simpler is safer for now:
          // If we have strict conflict resolution, we'd do it here.
          // For now, newer array overwrites older array is acceptable for atomic edits.
        }
      : payload;

    this.pendingRemoteChanges.set(changeKey, mergedPayload);

    // 2. Debounce the Backup Timer
    if (this.backupTimers.has(changeKey)) {
      clearTimeout(this.backupTimers.get(changeKey));
    }

    const timer = setTimeout(() => {
      this.executeBackupSave(changeKey);
    }, 15000); // 15 seconds of silence = "They stopped typing, let's save."

    this.backupTimers.set(changeKey, timer);
  }

  private executeBackupSave(changeKey: string) {
    // Only the Leader is allowed to write to the DB
    if (this.isLeader && this.pendingRemoteChanges.has(changeKey)) {
      console.log(`Backup Saver: Leader taking over for ${changeKey}`);

      const data = this.pendingRemoteChanges.get(changeKey);
      if (data) {
        // We tell the store to "Mark as Dirty" which triggers the local
        // save mechanism to fire a DB request.
        const storeToDirty =
          ExamBuilderStoreFactory.getState().createExamBuilderStoreFactory(
            data.examId,
          );

        // IMPORTANT: You need to implement this action in your store if not present
        storeToDirty.getState().markRemoteAsDirty(data);
      }
    }

    // Cleanup
    this.pendingRemoteChanges.delete(changeKey);
    this.backupTimers.delete(changeKey);
  }

  private handleSaveConfirmed(payload: { senderId: string; examId: string }) {
    const changeKey = `${payload.senderId}-${payload.examId}`;

    // Someone (probably the original sender) saved it. We can chill.
    if (this.backupTimers.has(changeKey)) {
      clearTimeout(this.backupTimers.get(changeKey));
      this.backupTimers.delete(changeKey);
    }
    this.pendingRemoteChanges.delete(changeKey);
  }

  private handlePresenceSync() {
    if (!this.channel) return;

    const state = this.channel.presenceState<PresenceState>();
    // Flatten the presence object (Supabase returns { id: [sessions] })
    const allPresences = Object.values(state).flat();

    // Sort by Join Time (Oldest = Leader)
    const sorted = allPresences.sort((a, b) => {
      const timeA = new Date(a.joined_at).getTime();
      const timeB = new Date(b.joined_at).getTime();
      if (timeA !== timeB) return timeA - timeB;
      return a.senderId.localeCompare(b.senderId); // Deterministic tie-breaker
    });

    this.presences = sorted;
    const leader = sorted[0];

    // Am I the leader?
    const amILeader = leader?.senderId === this.senderId;

    if (amILeader && !this.isLeader) {
      console.log("OrgHub Presence: You are now the Backup Saver Leader.");
    } else if (!amILeader && this.isLeader) {
      console.log("OrgHub Presence: You are no longer the Leader.");
    }

    this.isLeader = amILeader;
  }
}
