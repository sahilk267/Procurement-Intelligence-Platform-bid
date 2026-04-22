import { useState } from "react";
import { useListTenders, useGetTenderAnalysis, useGetGoNoGo } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase, ChevronDown, ChevronUp, ThumbsUp, ThumbsDown,
  AlertCircle, CheckCircle2, XCircle, Lightbulb, TrendingUp
} from "lucide-react";
import { formatDate as fd } from "@/lib/format";

function GoNoGoCard({ tenderId }: { tenderId: string }) {
  const { data, isLoading } = useGetGoNoGo({ pathParams: { tenderId } });

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return null;

  const isGo = data.recommendation === "go";
  return (
    <div className={`rounded-xl p-4 border-2 flex items-center gap-4 ${isGo ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700" : "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700"}`}>
      <div className={`rounded-full p-2 ${isGo ? "bg-green-200 dark:bg-green-800" : "bg-red-200 dark:bg-red-800"}`}>
        {isGo ? <ThumbsUp className="h-6 w-6 text-green-700 dark:text-green-300" /> : <ThumbsDown className="h-6 w-6 text-red-700 dark:text-red-300" />}
      </div>
      <div className="flex-1">
        <div className="font-bold text-lg">{isGo ? "GO — Recommended Bid" : "NO-GO — Skip this Tender"}</div>
        <div className="text-sm text-muted-foreground">Confidence: {data.confidence !== undefined ? `${Math.round(data.confidence * 100)}%` : "N/A"}</div>
      </div>
      <div className="text-right">
        <div className="text-2xl font-bold">{data.score !== undefined ? data.score : "—"}<span className="text-sm text-muted-foreground">/100</span></div>
      </div>
    </div>
  );
}

function TenderAnalysisPanel({ tender }: { tender: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: analysis, isLoading } = useGetTenderAnalysis({ pathParams: { tenderId: tender.id } });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 leading-snug">{tender.title}</CardTitle>
            <CardDescription className="mt-1">
              {tender.organisation} · {tender.source} · {formatDate(tender.closingDate)}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tender.estimatedValue && <span className="font-medium text-sm">{formatCurrency(tender.estimatedValue)}</span>}
            <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); setExpanded(!expanded); }}>
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          <GoNoGoCard tenderId={tender.id} />

          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : analysis ? (
            <div className="grid gap-4 md:grid-cols-2">
              {/* Summary */}
              {analysis.summary && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <Lightbulb className="h-4 w-4 text-amber-500" />
                    <span className="font-semibold text-sm">AI Summary</span>
                  </div>
                  <p className="text-sm text-muted-foreground bg-muted rounded-lg p-3">{analysis.summary}</p>
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span className="font-semibold text-sm">Strengths</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.strengths.map((s: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-green-500 mt-0.5 shrink-0">+</span>{s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Risks */}
              {analysis.risks && analysis.risks.length > 0 && (
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="font-semibold text-sm">Risks</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.risks.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-0.5 shrink-0">!</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="md:col-span-2">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                    <span className="font-semibold text-sm">Recommendations</span>
                  </div>
                  <ul className="space-y-1">
                    {analysis.recommendations.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-blue-500 mt-0.5 shrink-0">→</span>{r}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-muted-foreground py-8">No analysis available for this tender.</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function Analysis() {
  const { data: tenders, isLoading } = useListTenders();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Analysis</h1>
        <p className="text-muted-foreground">AI-powered tender analysis, risk assessment, and Go/No-Go recommendations.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {(tenders || []).map((tender) => (
            <TenderAnalysisPanel key={tender.id} tender={tender} />
          ))}
          {(!tenders || tenders.length === 0) && (
            <div className="text-center text-muted-foreground py-16">No tenders to analyze. Add tenders first.</div>
          )}
        </div>
      )}
    </div>
  );
}
