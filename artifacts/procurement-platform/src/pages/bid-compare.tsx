import { useState, useMemo } from "react";
import { useListBids } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Trophy, Scale, CheckCircle2, AlertCircle, XCircle,
  IndianRupee, Calendar, Shield, TrendingUp, Star,
  ChevronRight, Info, Zap, Target, BarChart2
} from "lucide-react";
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar,
  ResponsiveContainer, Tooltip as RechartsTooltip, Legend,
} from "recharts";
import { Link } from "wouter";

// ─── Scoring Engine ─────────────────────────────────────────────────────────

interface ScoreBreakdown {
  price: number;
  timeline: number;
  risk: number;
  opportunity: number;
  readiness: number;
  total: number;
}

interface ScoredBid {
  bid: any;
  scores: ScoreBreakdown;
  rank: number;
  isWinner: boolean;
  isClose: boolean;
}

const MAX_SCORES = { price: 30, timeline: 25, risk: 20, opportunity: 15, readiness: 10 };

function scoreBid(bid: any): ScoreBreakdown {
  const tender = bid.tender || {};
  const today = new Date();

  // 1. Price Score (30 pts) — how competitive vs tender estimate
  let price = 10;
  const target = Number(bid.targetValue || 0);
  const estimate = Number(tender.estimatedValue || 0);
  if (target > 0 && estimate > 0) {
    const ratio = target / estimate;
    if (ratio <= 0.90) price = 30;
    else if (ratio <= 0.95) price = 27;
    else if (ratio <= 1.00) price = 22;
    else if (ratio <= 1.05) price = 14;
    else price = 5;
  }

  // 2. Timeline Score (25 pts) — days until closing
  let timeline = 12;
  if (tender.closingDate) {
    const closing = new Date(tender.closingDate);
    const days = Math.ceil((closing.getTime() - today.getTime()) / 86400000);
    if (days > 60) timeline = 25;
    else if (days > 30) timeline = 20;
    else if (days > 14) timeline = 13;
    else if (days > 7) timeline = 7;
    else if (days > 0) timeline = 3;
    else timeline = 0; // past closing
  }

  // 3. Risk Score (20 pts) — tender risk level
  const riskMap: Record<string, number> = { green: 20, yellow: 11, red: 4 };
  const risk = riskMap[tender.riskScore || "yellow"] ?? 11;

  // 4. Opportunity Score (15 pts) — tender value (bigger = better)
  let opportunity = 5;
  if (estimate > 100_000_000) opportunity = 15;      // > 10 Cr
  else if (estimate > 50_000_000) opportunity = 13;  // > 5 Cr
  else if (estimate > 10_000_000) opportunity = 10;  // > 1 Cr
  else if (estimate > 5_000_000) opportunity = 8;    // > 50 L
  else opportunity = 5;

  // 5. Readiness Score (10 pts) — pipeline stage
  const readinessMap: Record<string, number> = {
    won: 10, submitted: 8, in_progress: 6, shortlisted: 3,
    lost: 0, dropped: 0,
  };
  const readiness = readinessMap[bid.stage] ?? 3;

  const total = price + timeline + risk + opportunity + readiness;
  return { price, timeline, risk, opportunity, readiness, total };
}

function rankBids(bids: any[]): ScoredBid[] {
  const scored = bids.map(bid => ({ bid, scores: scoreBid(bid) }));
  scored.sort((a, b) => b.scores.total - a.scores.total);

  const top = scored[0]?.scores.total || 0;
  return scored.map((item, i) => ({
    ...item,
    rank: i + 1,
    isWinner: i === 0,
    isClose: i > 0 && top - item.scores.total <= 6,
  }));
}

function generateRecommendation(ranked: ScoredBid[]): { headline: string; body: string; confidence: "high" | "medium" | "low" } {
  if (ranked.length === 0) return { headline: "No bids to compare", body: "", confidence: "low" };
  const winner = ranked[0];
  const runnerUp = ranked[1];

  const gap = runnerUp ? winner.scores.total - runnerUp.scores.total : 999;
  const confidence: "high" | "medium" | "low" = gap >= 15 ? "high" : gap >= 6 ? "medium" : "low";

  const tender = winner.bid.tender || {};
  const strengths: string[] = [];
  if (winner.scores.price === MAX_SCORES.price) strengths.push("highly competitive pricing");
  else if (winner.scores.price >= 22) strengths.push("competitive pricing");
  if (winner.scores.timeline >= 20) strengths.push("ample submission runway");
  if (winner.scores.risk === MAX_SCORES.risk) strengths.push("low-risk tender");
  if (winner.scores.opportunity >= 13) strengths.push("high-value opportunity");
  if (winner.scores.readiness >= 8) strengths.push("advanced pipeline stage");

  const name = tender.title ? `"${tender.title.substring(0, 55)}${tender.title.length > 55 ? "…" : ""}"` : `Bid #${winner.bid.id}`;
  const body = strengths.length > 0
    ? `${name} leads with ${strengths.slice(0, 3).join(", ")}. ${
        gap <= 6 && runnerUp
          ? `The margin over ${runnerUp.bid.tender?.title?.split(" ").slice(0, 4).join(" ") || "second bid"} is narrow (${gap} pts) — consider reviewing both.`
          : gap <= 15 && runnerUp
          ? `It edges out the runner-up by ${gap} points. A strong frontrunner with some room for improvement.`
          : "This is a clear frontrunner based on the scoring criteria."
      }`
    : `${name} scores highest overall (${winner.scores.total}/100). Review pricing and timeline before committing.`;

  const headline =
    confidence === "high" ? `Recommend: ${tender.title?.split(" ").slice(0, 6).join(" ") || `Bid #${winner.bid.id}`}` :
    confidence === "medium" ? `Lean Toward: ${tender.title?.split(" ").slice(0, 6).join(" ") || `Bid #${winner.bid.id}`}` :
    `Too Close to Call — Manual Review Needed`;

  return { headline, body, confidence };
}

// ─── Score Bar Component ─────────────────────────────────────────────────────

function ScoreBar({ value, max, color }: { value: number; max: number; color: string }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <Progress value={(value / max) * 100} className={`h-2 flex-1 ${color}`} />
      <span className="text-xs font-semibold tabular-nums w-8 text-right">{value}/{max}</span>
    </div>
  );
}

// ─── Criteria Row ─────────────────────────────────────────────────────────────

function CriteriaRow({ label, icon: Icon, scores, field, max, bids }: {
  label: string; icon: any; scores: ScoreBreakdown[]; field: keyof ScoreBreakdown;
  max: number; bids: any[];
}) {
  const maxVal = Math.max(...scores.map(s => s[field] as number));
  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 w-48">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Icon className="h-3.5 w-3.5 shrink-0" />
          <span>{label}</span>
          <span className="text-xs text-muted-foreground/60">/{max}</span>
        </div>
      </td>
      {scores.map((s, i) => {
        const val = s[field] as number;
        const isMax = val === maxVal;
        return (
          <td key={i} className="py-3 px-4">
            <div className="space-y-1.5">
              <div className={`text-sm font-bold ${isMax ? "text-emerald-600 dark:text-emerald-400" : "text-foreground"}`}>
                {val} {isMax && <span className="text-xs font-normal">★</span>}
              </div>
              <ScoreBar value={val} max={max} color={isMax ? "[&>div]:bg-emerald-500" : "[&>div]:bg-muted-foreground/40"} />
            </div>
          </td>
        );
      })}
    </tr>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const COLORS = ["hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))"];
const STAGE_LABEL: Record<string, string> = {
  shortlisted: "Shortlisted", in_progress: "In Progress",
  submitted: "Submitted", won: "Won",
  lost: "Lost", dropped: "Dropped",
};

export default function BidCompare() {
  const { data: bidsResp, isLoading } = useListBids();
  const allBids = bidsResp?.data || [];
  const [selected, setSelected] = useState<number[]>([]);

  function toggle(id: number) {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : prev.length < 3
        ? [...prev, id]
        : prev
    );
  }

  const selectedBids = useMemo(
    () => allBids.filter(b => selected.includes(b.id)),
    [allBids, selected]
  );

  const ranked = useMemo(() => rankBids(selectedBids), [selectedBids]);
  const recommendation = useMemo(() => generateRecommendation(ranked), [ranked]);

  const radarData = useMemo(() => {
    if (ranked.length < 2) return [];
    const criteria = [
      { key: "price", label: "Price" },
      { key: "timeline", label: "Timeline" },
      { key: "risk", label: "Low Risk" },
      { key: "opportunity", label: "Value" },
      { key: "readiness", label: "Readiness" },
    ];
    return criteria.map(c => {
      const row: Record<string, any> = { label: c.label };
      ranked.forEach((item, i) => {
        const maxVal = MAX_SCORES[c.key as keyof typeof MAX_SCORES];
        row[`bid${i}`] = Math.round(((item.scores[c.key as keyof ScoreBreakdown] as number) / maxVal) * 100);
      });
      return row;
    });
  }, [ranked]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
            <Link href="/bids" className="hover:text-foreground transition-colors">Bids Pipeline</Link>
            <ChevronRight className="h-3.5 w-3.5" />
            <span className="text-foreground font-medium">Compare</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Bid Comparison</h1>
          <p className="text-muted-foreground">
            Select 2–3 bids to score and compare side-by-side. Auto-scoring across 5 dimensions.
          </p>
        </div>
        {selected.length >= 2 && (
          <Button variant="outline" onClick={() => setSelected([])}>Clear Selection</Button>
        )}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Bid Selector */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Target className="h-4 w-4 text-primary" />
                Select Bids to Compare
              </CardTitle>
              <CardDescription>
                Choose 2 or 3 bids. {selected.length === 3 ? "Limit reached." : `${3 - selected.length} more allowed.`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 max-h-[600px] overflow-y-auto">
              {isLoading ? (
                [1,2,3,4,5].map(i => <Skeleton key={i} className="h-20 w-full" />)
              ) : allBids.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No bids found in pipeline.</p>
              ) : (
                allBids.map(bid => {
                  const isSelected = selected.includes(bid.id);
                  const isDisabled = !isSelected && selected.length >= 3;
                  const idx = selected.indexOf(bid.id);
                  return (
                    <button
                      key={bid.id}
                      onClick={() => !isDisabled && toggle(bid.id)}
                      disabled={isDisabled}
                      className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                        isSelected
                          ? "border-primary bg-primary/5 shadow-sm"
                          : isDisabled
                          ? "border-border opacity-40 cursor-not-allowed"
                          : "border-border hover:border-primary/40 hover:bg-muted/50 cursor-pointer"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium line-clamp-1">
                            {bid.tender?.title || `Bid #${bid.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground">{bid.tender?.authority}</p>
                        </div>
                        {isSelected && (
                          <span
                            className="shrink-0 w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center"
                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                          >
                            {idx + 1}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="text-[10px] capitalize px-1 py-0">
                          {STAGE_LABEL[bid.stage] || bid.stage}
                        </Badge>
                        {bid.tender?.riskScore && (
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1 py-0 ${
                              bid.tender.riskScore === "green" ? "border-green-400 text-green-600" :
                              bid.tender.riskScore === "red" ? "border-red-400 text-red-600" :
                              "border-amber-400 text-amber-600"
                            }`}
                          >
                            {bid.tender.riskScore === "green" ? "Low Risk" : bid.tender.riskScore === "red" ? "High Risk" : "Medium Risk"}
                          </Badge>
                        )}
                        {bid.targetValue && (
                          <span className="text-xs text-muted-foreground ml-auto">
                            {formatCurrency(Number(bid.targetValue))}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right: Comparison Results */}
        <div className="lg:col-span-2 space-y-6">
          {selected.length < 2 ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground border-2 border-dashed rounded-2xl">
              <Scale className="h-14 w-14 opacity-20 mb-3" />
              <p className="font-medium">Select at least 2 bids to compare</p>
              <p className="text-sm opacity-70">Scores will appear here automatically</p>
            </div>
          ) : (
            <>
              {/* Recommendation Banner */}
              <Card className={`border-2 ${
                recommendation.confidence === "high" ? "border-emerald-400 bg-emerald-50/50 dark:bg-emerald-950/30" :
                recommendation.confidence === "medium" ? "border-blue-400 bg-blue-50/50 dark:bg-blue-950/30" :
                "border-amber-400 bg-amber-50/50 dark:bg-amber-950/30"
              }`}>
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`p-2 rounded-full shrink-0 ${
                      recommendation.confidence === "high" ? "bg-emerald-100 dark:bg-emerald-900" :
                      recommendation.confidence === "medium" ? "bg-blue-100 dark:bg-blue-900" :
                      "bg-amber-100 dark:bg-amber-900"
                    }`}>
                      {recommendation.confidence === "high" ? <Trophy className="h-5 w-5 text-emerald-600" /> :
                       recommendation.confidence === "medium" ? <Zap className="h-5 w-5 text-blue-600" /> :
                       <Info className="h-5 w-5 text-amber-600" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-bold text-base">{recommendation.headline}</p>
                        <Badge variant="outline" className={`text-xs capitalize ${
                          recommendation.confidence === "high" ? "border-emerald-400 text-emerald-700" :
                          recommendation.confidence === "medium" ? "border-blue-400 text-blue-700" :
                          "border-amber-400 text-amber-700"
                        }`}>
                          {recommendation.confidence} confidence
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">{recommendation.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Score Summary Cards */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${ranked.length}, minmax(0, 1fr))` }}>
                {ranked.map((item, i) => (
                  <Card key={item.bid.id} className={`relative overflow-hidden ${item.isWinner ? "ring-2 ring-primary" : ""}`}>
                    {item.isWinner && (
                      <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-bl-lg">
                        TOP PICK
                      </div>
                    )}
                    <CardHeader className="pb-2 pt-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-5 h-5 rounded-full text-white text-xs font-bold flex items-center justify-center shrink-0"
                          style={{ backgroundColor: COLORS[i % COLORS.length] }}
                        >
                          {item.rank}
                        </span>
                        <CardTitle className="text-sm line-clamp-1">
                          {item.bid.tender?.title?.split(" ").slice(0, 5).join(" ") || `Bid #${item.bid.id}`}
                        </CardTitle>
                      </div>
                    </CardHeader>
                    <CardContent className="pb-4">
                      <div className="text-3xl font-black mb-1" style={{ color: COLORS[i % COLORS.length] }}>
                        {item.scores.total}
                        <span className="text-base font-normal text-muted-foreground">/100</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{item.bid.tender?.authority}</p>
                      <div className="mt-3 space-y-1">
                        {[
                          { label: "Price", val: item.scores.price, max: MAX_SCORES.price },
                          { label: "Timeline", val: item.scores.timeline, max: MAX_SCORES.timeline },
                          { label: "Risk", val: item.scores.risk, max: MAX_SCORES.risk },
                          { label: "Value", val: item.scores.opportunity, max: MAX_SCORES.opportunity },
                          { label: "Stage", val: item.scores.readiness, max: MAX_SCORES.readiness },
                        ].map(row => (
                          <div key={row.label} className="flex items-center gap-2 text-xs">
                            <span className="w-14 text-muted-foreground">{row.label}</span>
                            <Progress value={(row.val / row.max) * 100} className="h-1 flex-1" />
                            <span className="w-8 text-right font-medium">{row.val}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Radar Chart */}
              {radarData.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart2 className="h-4 w-4 text-primary" />
                      Radar Comparison
                    </CardTitle>
                    <CardDescription>Normalised scores (0–100%) across all 5 criteria</CardDescription>
                  </CardHeader>
                  <CardContent className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <RadarChart data={radarData}>
                        <PolarGrid stroke="hsl(var(--border))" />
                        <PolarAngleAxis dataKey="label" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                        {ranked.map((item, i) => (
                          <Radar
                            key={item.bid.id}
                            name={item.bid.tender?.title?.split(" ").slice(0, 4).join(" ") || `Bid ${i + 1}`}
                            dataKey={`bid${i}`}
                            stroke={COLORS[i]}
                            fill={COLORS[i]}
                            fillOpacity={0.15}
                            strokeWidth={2}
                          />
                        ))}
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <RechartsTooltip
                          formatter={(val: number) => [`${val}%`, ""]}
                          contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                        />
                      </RadarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              {/* Detailed Score Table */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Detailed Score Breakdown</CardTitle>
                  <CardDescription>
                    Full criteria analysis · ★ marks best score in each row
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border bg-muted/40">
                          <th className="text-left py-3 px-4 text-xs font-semibold text-muted-foreground uppercase tracking-wide w-48">
                            Criteria
                          </th>
                          {ranked.map((item, i) => (
                            <th key={item.bid.id} className="text-left py-3 px-4 text-xs font-semibold uppercase tracking-wide">
                              <div className="flex items-center gap-2">
                                <span
                                  className="w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center"
                                  style={{ backgroundColor: COLORS[i % COLORS.length] }}
                                >
                                  {item.rank}
                                </span>
                                <span className="text-muted-foreground">
                                  {item.bid.tender?.title?.split(" ").slice(0, 4).join(" ") || `Bid #${item.bid.id}`}
                                </span>
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        <CriteriaRow
                          label="Price Competitiveness"
                          icon={IndianRupee}
                          scores={ranked.map(r => r.scores)}
                          field="price"
                          max={MAX_SCORES.price}
                          bids={ranked.map(r => r.bid)}
                        />
                        <CriteriaRow
                          label="Submission Timeline"
                          icon={Calendar}
                          scores={ranked.map(r => r.scores)}
                          field="timeline"
                          max={MAX_SCORES.timeline}
                          bids={ranked.map(r => r.bid)}
                        />
                        <CriteriaRow
                          label="Tender Risk Level"
                          icon={Shield}
                          scores={ranked.map(r => r.scores)}
                          field="risk"
                          max={MAX_SCORES.risk}
                          bids={ranked.map(r => r.bid)}
                        />
                        <CriteriaRow
                          label="Opportunity Value"
                          icon={TrendingUp}
                          scores={ranked.map(r => r.scores)}
                          field="opportunity"
                          max={MAX_SCORES.opportunity}
                          bids={ranked.map(r => r.bid)}
                        />
                        <CriteriaRow
                          label="Pipeline Readiness"
                          icon={Star}
                          scores={ranked.map(r => r.scores)}
                          field="readiness"
                          max={MAX_SCORES.readiness}
                          bids={ranked.map(r => r.bid)}
                        />
                        {/* Total Row */}
                        <tr className="bg-muted/40 border-t-2 border-border">
                          <td className="py-3 px-4">
                            <span className="text-sm font-bold">Total Score</span>
                          </td>
                          {ranked.map((item, i) => (
                            <td key={item.bid.id} className="py-3 px-4">
                              <span
                                className="text-lg font-black"
                                style={{ color: COLORS[i % COLORS.length] }}
                              >
                                {item.scores.total}
                              </span>
                              <span className="text-sm text-muted-foreground">/100</span>
                              {item.isWinner && (
                                <Trophy className="h-4 w-4 text-amber-500 inline ml-2" />
                              )}
                            </td>
                          ))}
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>

              {/* Bid Detail Cards */}
              <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${ranked.length}, minmax(0, 1fr))` }}>
                {ranked.map((item, i) => {
                  const t = item.bid.tender || {};
                  return (
                    <Card key={item.bid.id}>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">
                          Bid Details
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Our Bid</span>
                          <span className="font-semibold">{item.bid.targetValue ? formatCurrency(Number(item.bid.targetValue)) : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Estimate</span>
                          <span>{t.estimatedValue ? formatCurrency(Number(t.estimatedValue)) : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Closing</span>
                          <span>{t.closingDate ? formatDate(t.closingDate) : "—"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Source</span>
                          <Badge variant="outline" className="text-xs capitalize">{t.source || "—"}</Badge>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Stage</span>
                          <Badge
                            variant={item.bid.stage === "won" ? "default" : item.bid.stage === "lost" ? "destructive" : "secondary"}
                            className="text-xs capitalize"
                          >
                            {STAGE_LABEL[item.bid.stage] || item.bid.stage}
                          </Badge>
                        </div>
                        {item.bid.notes && (
                          <p className="text-xs text-muted-foreground border-t pt-2 mt-2 line-clamp-2">{item.bid.notes}</p>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
