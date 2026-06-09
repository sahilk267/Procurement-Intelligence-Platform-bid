import { useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useListBids, useGetCurrentUser, getListBidsQueryKey, updateBid, type ListBidsParams, type ListBidsStage } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "wouter";
import {
  Target, ChevronRight, Calendar, IndianRupee, Scale,
} from "lucide-react";

const STAGE_ORDER = ["shortlisted", "in_progress", "submitted", "won", "lost", "dropped"];
const STAGE_LABELS: Record<string, string> = {
  shortlisted: "Shortlisted",
  in_progress: "In Progress",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  dropped: "Dropped",
};
const STAGE_COLORS: Record<string, string> = {
  shortlisted: "bg-slate-100 border-slate-300 dark:bg-slate-800 dark:border-slate-700",
  in_progress: "bg-blue-50 border-blue-200 dark:bg-blue-950 dark:border-blue-800",
  submitted: "bg-purple-50 border-purple-200 dark:bg-purple-950 dark:border-purple-800",
  won: "bg-green-50 border-green-200 dark:bg-green-950 dark:border-green-800",
  lost: "bg-red-50 border-red-200 dark:bg-red-950 dark:border-red-800",
  dropped: "bg-gray-50 border-gray-200 dark:bg-gray-900 dark:border-gray-800",
};

const BADGE_VARIANT: Record<string, any> = {
  won: "default",
  lost: "destructive",
  submitted: "secondary",
  in_progress: "outline",
  shortlisted: "outline",
  dropped: "secondary",
};

const STAGE_SELECT_ITEMS = ["all", ...STAGE_ORDER] as const;

function getDaysUntil(dateString?: string) {
  if (!dateString) return null;
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  const diff = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  return diff;
}

export default function Bids() {
  const queryClient = useQueryClient();
  const { data: currentUser } = useGetCurrentUser();
  const [view, setView] = useState<"kanban" | "list">("kanban");
  const [stageFilter, setStageFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [mineOnly, setMineOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const queryParams = useMemo<ListBidsParams>(() => ({
    stage: stageFilter !== "all" ? stageFilter as ListBidsStage : undefined,
  }), [stageFilter]);

  const { data: response, isLoading } = useListBids(queryParams, {
    query: { queryKey: getListBidsQueryKey(queryParams) },
  });

  const bids = response?.data ?? [];
  const filteredBids = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return bids;
    return bids.filter((bid) => {
      return [
        bid.tender?.title,
        bid.tender?.referenceNumber,
        bid.notes,
        bid.tender?.authority,
      ]
        .filter(Boolean)
        .some((value) => value?.toString().toLowerCase().includes(term));
    });
  }, [bids, search]);

  const grouped: Record<string, typeof bids> = {};
  STAGE_ORDER.forEach((stage) => { grouped[stage] = []; });
  filteredBids.forEach((bid) => {
    const stage = bid.stage || "shortlisted";
    if (!grouped[stage]) grouped[stage] = [];
    grouped[stage]!.push(bid);
  });

  const mutation = useMutation({
    mutationFn: ({ id, stage }: { id: number; stage: string }) => updateBid(id, { stage }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: getListBidsQueryKey(queryParams) }),
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Bids Pipeline</h1>
          <p className="text-muted-foreground">Track your proposals through shortlisting, submission, and award.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" asChild>
            <Link href="/bids/compare">
              <Scale className="h-4 w-4" />
              Compare Bids
            </Link>
          </Button>
          <Button variant={view === "kanban" ? "default" : "outline"} size="sm" onClick={() => setView("kanban")}>Kanban</Button>
          <Button variant={view === "list" ? "default" : "outline"} size="sm" onClick={() => setView("list")}>List</Button>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1.75fr_1fr]">
        <Card>
          <div className="p-4 grid gap-3 sm:grid-cols-[1.5fr_1fr] lg:grid-cols-[2fr_1fr_1fr] items-end">
            <div className="relative">
              <Input
                type="search"
                placeholder="Search bids, tenders, or notes"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                className="pl-10"
              />
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">🔍</span>
            </div>
            <Select value={stageFilter} onValueChange={(value) => { setStageFilter(value); setPage(1); }}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_SELECT_ITEMS.map((stage) => (
                  <SelectItem key={stage} value={stage}>{stage === "all" ? "All stages" : STAGE_LABELS[stage]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={mineOnly ? "default" : "outline"}
              size="sm"
              onClick={() => setMineOnly((current) => !current)}
            >
              {mineOnly ? "Assigned to me" : "Show my bids"}
            </Button>
          </div>
        </Card>

        <Card>
          <div className="p-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-border p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Total bids</p>
              <p className="text-2xl font-semibold">{response?.total ?? 0}</p>
            </div>
            <div className="rounded-xl border border-border p-4 bg-muted/30">
              <p className="text-sm text-muted-foreground">Filtered results</p>
              <p className="text-2xl font-semibold">{filteredBids.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-[280px] w-full" />
          ))}
        </div>
      ) : view === "kanban" ? (
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 min-w-max">
            {STAGE_ORDER.map((stage) => (
              <div key={stage} className="w-80">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{STAGE_LABELS[stage]}</span>
                  <Badge variant="outline" className="text-xs">{grouped[stage]?.length || 0}</Badge>
                </div>
                <div className={`min-h-[280px] rounded-xl border-2 p-3 space-y-3 ${STAGE_COLORS[stage]}`}>
                  {(grouped[stage] || []).map((bid) => (
                    <BidCard
                      key={bid.id}
                      bid={bid}
                      onStageChange={(nextStage) => mutation.mutate({ id: bid.id, stage: nextStage })}
                      isUpdating={mutation.isPending}
                    />
                  ))}
                  {(grouped[stage] || []).length === 0 && (
                    <div className="text-xs text-muted-foreground text-center py-8 opacity-50">No bids here yet.</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBids.map((bid) => (
            <BidListRow
              key={bid.id}
              bid={bid}
              onStageChange={(nextStage) => mutation.mutate({ id: bid.id, stage: nextStage })}
              isUpdating={mutation.isPending}
            />
          ))}
          {filteredBids.length === 0 && (
            <div className="text-center text-muted-foreground py-16">No bids match your filters.</div>
          )}
        </div>
      )}

      {!isLoading && response?.total ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between text-sm text-muted-foreground">
          <div>
            Showing {filteredBids.length} of {response.total} bids
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))}>
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page * limit >= (response.total ?? 0)}
              onClick={() => setPage((current) => current + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function BidCard({
  bid,
  onStageChange,
  isUpdating,
}: {
  bid: any;
  onStageChange: (stage: string) => void;
  isUpdating?: boolean;
}) {
  const dueDays = getDaysUntil(bid.submissionDate || bid.submissionDeadline);
  const dueLabel = dueDays === null ? null : dueDays < 0 ? `Overdue by ${Math.abs(dueDays)} days` : `Due in ${dueDays} day${dueDays === 1 ? "" : "s"}`;

  return (
    <div className="bg-card rounded-xl p-4 shadow-sm border border-border transition-shadow hover:shadow-md">
      <div className="space-y-3">
        <div>
          <p className="text-sm font-semibold leading-snug line-clamp-2">{bid.tender?.title ?? "Untitled Tender"}</p>
          <p className="text-xs text-muted-foreground mt-1">{bid.tender?.authority || "No authority"}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          {bid.tender?.estimatedValue && (
            <span className="inline-flex items-center gap-1">
              <IndianRupee className="h-3 w-3" /> {formatCurrency(Number(bid.tender.estimatedValue))}
            </span>
          )}
          {dueLabel && <span>{dueLabel}</span>}
          {bid.assignedTo && <span>Assigned to {bid.assignedTo}</span>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <Badge variant={BADGE_VARIANT[bid.stage] || "outline"}>
            {STAGE_LABELS[bid.stage] || bid.stage}
          </Badge>
          <Select value={bid.stage} onValueChange={(value) => value !== bid.stage && onStageChange(value)}>
            <SelectTrigger className="min-w-[140px]">
              <SelectValue placeholder="Move stage" />
            </SelectTrigger>
            <SelectContent>
              {STAGE_ORDER.map((stage) => (
                <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

function BidListRow({
  bid,
  onStageChange,
  isUpdating,
}: {
  bid: any;
  onStageChange: (stage: string) => void;
  isUpdating?: boolean;
}) {
  const dueDays = getDaysUntil(bid.submissionDate || bid.submissionDeadline);
  const dueLabel = dueDays === null ? null : dueDays < 0 ? `Overdue by ${Math.abs(dueDays)}d` : `${dueDays}d left`;

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <Link href={`/bids/${bid.id}`}>
              <p className="font-semibold text-sm line-clamp-1">{bid.tender?.title ?? "Untitled Tender"}</p>
            </Link>
            <p className="text-xs text-muted-foreground mt-1">{bid.tender?.referenceNumber || `Bid #${bid.id}`}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
            {bid.tender?.estimatedValue && <span>{formatCurrency(Number(bid.tender.estimatedValue))}</span>}
            {dueLabel && <span>{dueLabel}</span>}
            <Badge variant={BADGE_VARIANT[bid.stage] || "outline"}>
              {STAGE_LABELS[bid.stage] || bid.stage}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <Select value={bid.stage} onValueChange={(value) => value !== bid.stage && onStageChange(value)}>
              <SelectTrigger className="min-w-[140px]">
                <SelectValue placeholder="Change stage" />
              </SelectTrigger>
              <SelectContent>
                {STAGE_ORDER.map((stage) => (
                  <SelectItem key={stage} value={stage}>{STAGE_LABELS[stage]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
