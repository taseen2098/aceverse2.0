import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Exam } from "@/server/BasicStudentApi";
import { Clock, Calendar, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import ExamCardButtonDropDown from "./ExamCardButtonDropdown";
import Link from "next/link";
import { useAuthStore } from "@/lib/store/useAuthStore";

export default function ExamCard({ exam }: { exam: Exam }) {
  const isStaff = useAuthStore((state) => state.isCurrentMemberStaff());
  const organizationId = useAuthStore(
    (state) => state.getCurrentMembership()?.organization_id || null,
  );

  return (
    <Card
      key={exam.id}
      className="group overflow-hidden border-aceverse-blue/10 hover:border-aceverse-blue/40 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col"
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <Badge
            variant={exam.is_published ? "default" : "secondary"}
            className={
              exam.is_published
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-100 text-gray-600 border-none"
            }
          >
            {exam.is_published ? "Active" : "Draft"}
          </Badge>

          {isStaff && (
            <ExamCardButtonDropDown
              organizationId={organizationId as string}
              exam={exam}
            />
          )}
        </div>

        <CardTitle className="text-xl mt-3 line-clamp-1 text-aceverse-navy group-hover:text-aceverse-blue transition-colors">
          {exam.title}
        </CardTitle>

        <CardDescription className="line-clamp-2 min-h-10">
          {exam.description || "No description provided."}
        </CardDescription>
      </CardHeader>

      <CardContent className="pb-4 flex-1">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-aceverse-blue/60" />

          <span>{exam.duration} mins</span>
        </div>

        {exam.start_time && <p className="block my-2">
          <Calendar className="h-4 w-4 text-aceverse-blue/60 inline" />{" "}
          Started at:{" "}
          {format(new Date(exam.start_time), "MMM d, yyyy")}
        </p>}
        {exam.end_time && <p className="block my-2">
          <Calendar className="h-4 w-4 text-aceverse-blue/60 inline" />{" "}
          Will end at:{" "}
          {format(new Date(exam.end_time), "MMM d, yyyy")}
        </p>}
      </CardContent>

      <CardFooter className="pt-4 border-t bg-gray-50/50">
        {isStaff ? (
          <div className="grid grid-cols-2 gap-2 w-full">
            <Link
              href={`/org/${organizationId}/edit-exam/${exam.id}`}
              className="w-full"
            >
              <Button
                variant="outline"
                size="sm"
                className="w-full hover:bg-white hover:border-aceverse-blue hover:text-aceverse-blue"
              >
                Edit
              </Button>
            </Link>

            <Link href={`/grading/${exam.id}`} className="w-full">
              <Button
                variant="default"
                size="sm"
                className="w-full bg-aceverse-navy hover:bg-aceverse-navy/90"
              >
                Results
              </Button>
            </Link>
          </div>
        ) : (
          <Link href={`/exam/${exam.id}`} className="w-full">
            <Button
              variant="default"
              className="w-full bg-aceverse-blue hover:bg-aceverse-blue/90 font-bold"
            >
              Start Exam <ExternalLink className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        )}
      </CardFooter>
    </Card>
  );
}
