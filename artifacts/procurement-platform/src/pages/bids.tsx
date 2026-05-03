import { useState } from "react";
import { useListBids, useGetBid, useGetBidTasks } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useLocation } from "wouter";
import {
  Target, ChevronRight, Calendar, AlertCircle, CheckCircle2,
  Clock, BarChart2, FileText, IndianRupee, Scale
} from "lucide-react";

const STAGE_ORDER = ["identification", "evaluation", "bid_prep", "submitted", "won", "lost", "no_bid"];
const STAGE_LABELS: Record<string, string> = {
  identification: "Identified",
  evaluation: "Evaluating",
  bid_prep: "Bid Prep",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  no_bid: "No Bid",
};
const STAGE_COLORS: Record<string, string> = {
  identification: "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700",
  evaluation: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  bid_prep: "bg-amber-50 border-amber-200 dark:bg-amber-950 dark:border-amber-800",
  submitted: "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800",
  won: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  lost: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
  no_bid: "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800",
};

const BADGE_VARIANT: Record<string, any> = {
  won: "default",
  lost: "destructive",
  submitted: "secondary",
  bid_prep: "outline",
  evaluation: "outline",
  identification: "secondary",
  no_bid: "secondary",
};

export default function Bids() {
  const { data: bids, isLoading } = useListBids();
  const [view, setView] = useState<"kanban" | "list">("kanban");

  const grouped: Record<string, typeof bids> = {};
  STAGE_ORDER.forEach((s) => { grouped[s] = []; });
  (bids || []).forEach((bid) => {
    const stage = bid.stage || "identification";
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage]!.push(bid);
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bids Pipeline</h1>
          <p className="text-muted-foreground">Track all active and historical bids through their lifecycle.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/bids/compare">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Scale className="h-4 w-4" />
              Compare Bids
            </Button>
          </Link>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>List</Button>
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-64 w-full" />)}
        </div>
      ) : view === "kanban" ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGE_ORDER.map((stage) => (
              <div key={stage} className="w-72">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
                  <Badge variant="outline" className="text-xs">{grouped[stage]?.length || 0}</Badge>
                </div>
                <div className={`min-h-48 rounded-xl border-2 p-3 space-y-3 ${STAGE_COLORS[stage]}`}>
                  {(grouped[stage] || []).map((bid) => (
                    <BidCard key={bid.id} bid={bid} />
                  ))}
                  {(grouped[stage] || []).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 opacity-50">No bids</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {(bids || []).map((bid) => (
            <BidListRow key={bid.id} bid={bid} />
          ))}
          {(!bids || bids.length === 0) && (
            <div className="text-center text-muted-foreground py-16">No bids found.</div>
          )}
        </div>
      )}
    </div>
  );
}

function BidCard({ bid }: { bid: any }) {
  return (
    <Link href={`/bids/${bid.id}`}>
      <div className="bg-card rounded-lg p-3 shadow-sm border border-border hover:shadow-md transition-shadow cursor-pointer space-y-2">
        <p className="text-sm font-medium line-clamp-2 leading-snug">{bid.tenderTitle || "Bid"}</p>
        {bid.estimatedValue && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <IndianRupee className="h-3 w-3" />
            {formatCurrency(bid.estimatedValue)}
          </div>
        )}
        {bid.submissionDeadline && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDate(bid.submissionDeadline)}
          </div>
        )}
        {bid.assignedTo && (
          <div className="flex items-center gap-1">
            <div className="h-5 w-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-medium">
              {bid.assignedTo.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted-foreground truncate">{bid.assignedTo}</span>
          </div>
        )}
        <div className="flex items-center justify-between pt-1">
          <Badge variant="outline" className="text-[10px] px-1 py-0">{bid.source || "GeM"}</Badge>
          {bid.winProbability && (
            <span className="text-xs text-muted-foreground">{Math.round(bid.winProbability * 100)}% win</span>
          )}
        </div>
      </div>
    </Link>
  );
}

function BidListRow({ bid }: { bid: any }) {
  return (
    <Link href={`/bids/${bid.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex items-start gap-2">
                <Target className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm line-clamp-1">{bid.tenderTitle || "Bid"}</p>
                  <p className="text-xs text-muted-foreground">{bid.referenceNumber || bid.id}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm shrink-0">
              {bid.estimatedValue && (
                <span className="font-medium">{formatCurrency(bid.estimatedValue)}</span>
              )}
              {bid.submissionDeadline && (
                <div className="flex items-center gap-1 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" />
                  {formatDate(bid.submissionDeadline)}
                </div>
              )}
              <Badge variant={BADGE_VARIANT[bid.stage] || "outline"}>
                {STAGE_LABELS[bid.stage] || bid.stage}
              </Badge>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
