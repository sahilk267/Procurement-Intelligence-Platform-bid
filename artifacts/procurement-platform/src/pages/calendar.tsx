import { useState } from "react";
import { useListCalendarEvents, useGetUpcomingDeadlines } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Clock, AlertTriangle, CheckCircle2, Calendar as CalIcon } from "lucide-react";

const EVENT_COLORS: Record<string, string> = {
  submission_deadline: "border-l-red-500 bg-red-50 dark:bg-red-950",
  pre_bid_meeting: "border-l-blue-500 bg-blue-50 dark:bg-blue-950",
  document_release: "border-l-green-500 bg-green-50 dark:bg-green-950",
  amendment: "border-l-amber-500 bg-amber-50 dark:bg-amber-950",
  result: "border-l-purple-500 bg-purple-50 dark:bg-purple-950",
  other: "border-l-gray-400 bg-gray-50 dark:bg-gray-900",
};

const URGENCY_VARIANTS: Record<string, any> = {
  critical: "destructive",
  high: "outline",
  medium: "secondary",
  low: "secondary",
};

export default function CalendarPage() {
  const { data: events, isLoading } = useListCalendarEvents();
  const { data: deadlines, isLoading: deadlinesLoading } = useGetUpcomingDeadlines();
  const [view, setView] = useState<"list" | "deadlines">("deadlines");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bid Calendar</h1>
          <p className="text-muted-foreground">Track all tender deadlines, meetings, and key procurement milestones.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView("deadlines")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === "deadlines" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            Upcoming Deadlines
          </button>
          <button
            onClick={() => setView("list")}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === "list" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
          >
            All Events
          </button>
        </div>
      </div>

      {view === "deadlines" && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {deadlinesLoading ? (
              [1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)
            ) : (deadlines || []).length > 0 ? (
              (deadlines || []).map((deadline) => (
                <div key={deadline.id} className={`border-l-4 rounded-r-xl p-4 ${deadline.urgency === "critical" ? "border-l-red-500 bg-red-50 dark:bg-red-950" : deadline.urgency === "high" ? "border-l-amber-500 bg-amber-50 dark:bg-amber-950" : "border-l-blue-400 bg-blue-50 dark:bg-blue-950"}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm line-clamp-1">{deadline.tenderTitle}</p>
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <CalIcon className="h-3.5 w-3.5" />
                          {formatDate(deadline.date)}
                        </div>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                          {deadline.type.replace("_", " ")}
                        </Badge>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <Badge variant={URGENCY_VARIANTS[deadline.urgency || "low"] || "secondary"} className="uppercase text-[10px]">
                        {deadline.urgency || "low"}
                      </Badge>
                      <span className={`text-lg font-bold ${(deadline.daysRemaining ?? 999) <= 3 ? "text-red-600" : (deadline.daysRemaining ?? 999) <= 7 ? "text-amber-600" : "text-foreground"}`}>
                        {deadline.daysRemaining ?? "-"}d
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-16">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
                No critical deadlines coming up.
              </div>
            )}
          </div>
        </div>
      )}

      {view === "list" && (
        <div className="space-y-3">
          {isLoading ? (
            [1,2,3,4].map(i => <Skeleton key={i} className="h-20 w-full" />)
          ) : (events || []).length > 0 ? (
            (events || []).map((event) => (
              <div key={event.id} className={`border-l-4 rounded-r-xl p-4 ${EVENT_COLORS[event.type] || EVENT_COLORS.other}`}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{event.tenderTitle}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatDate(event.date)}
                      </div>
                      <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">
                        {event.type?.replace("_", " ")}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center text-muted-foreground py-16">
              <CalendarDays className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No calendar events found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
