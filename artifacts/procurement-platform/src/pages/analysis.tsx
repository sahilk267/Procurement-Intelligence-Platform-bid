import { useState } from "react";
import { useGetGoNoGo, useGetTenderAnalysis, useListTenders } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, CheckCircle2, ChevronDown, ChevronUp, Lightbulb, Target } from "lucide-react";

function GoNoGoCard({ tenderId }: { tenderId: number }) {
  const { data, isLoading } = useGetGoNoGo(tenderId);

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return null;

  const variant = data.decision === "bid" ? "default" : data.decision === "skip" ? "destructive" : "secondary";

  return (
    <div className="flex items-center gap-4 rounded-lg border p-4">
      <Target className="h-8 w-8 text-primary" />
      <div className="flex-1">
        <div className="font-semibold">{data.decision.toUpperCase()} recommendation</div>
        <div className="text-sm text-muted-foreground">{data.reasoning || data.recommendation}</div>
      </div>
      <div className="text-right">
        <Badge variant={variant}>{data.score}/100</Badge>
      </div>
    </div>
  );
}

function TenderAnalysisPanel({ tender }: { tender: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: analysis, isLoading } = useGetTenderAnalysis(Number(tender.id), {
    query: { enabled: expanded, queryKey: ["tender-analysis", tender.id] },
  });

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer pb-3" onClick={() => setExpanded((value) => !value)}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-base leading-snug">{tender.title}</CardTitle>
            <CardDescription className="mt-1">
              {tender.authority} - {tender.source} - {formatDate(tender.closingDate)}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {tender.estimatedValue && <span className="text-sm font-medium">{formatCurrency(Number(tender.estimatedValue))}</span>}
            <Button variant="ghost" size="icon" type="button">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          <GoNoGoCard tenderId={Number(tender.id)} />

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => <Skeleton key={item} className="h-16 w-full" />)}
            </div>
          ) : analysis ? (
            <div className="grid gap-4 md:grid-cols-2">
              {analysis.aiSummary && (
                <InfoBlock title="AI Summary" icon={Lightbulb} className="md:col-span-2">
                  {analysis.aiSummary}
                </InfoBlock>
              )}

              <InfoList
                title="Eligibility Criteria"
                icon={CheckCircle2}
                items={(analysis.eligibilityCriteria || []).map((item) => item.criterion || item.notes || "Eligibility item")}
              />
              <InfoList
                title="Risk Factors"
                icon={AlertCircle}
                items={(analysis.riskFactors || []).map((item) => item.factor || item.severity || "Risk item")}
              />
              <InfoList title="Hidden Clauses" icon={AlertCircle} items={analysis.hiddenClauses || []} className="md:col-span-2" />
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No analysis available. Run AI summary from Core Features.</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function InfoBlock({ title, icon: Icon, children, className = "" }: { title: string; icon: any; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <div className="mb-2 flex items-center gap-2">
        <Icon className="h-4 w-4 text-primary" />
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">{children}</p>
    </div>
  );
}

function InfoList({ title, icon, items, className }: { title: string; icon: any; items: string[]; className?: string }) {
  if (items.length === 0) return null;
  return (
    <InfoBlock title={title} icon={icon} className={className}>
      <span className="block space-y-1">
        {items.map((item, index) => (
          <span key={index} className="block">{item}</span>
        ))}
      </span>
    </InfoBlock>
  );
}

export default function Analysis() {
  const { data: tenders, isLoading } = useListTenders();
  const tenderList = tenders?.data ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">AI Analysis</h1>
        <p className="text-muted-foreground">AI-powered tender analysis, risk assessment, and Go/No-Go recommendations.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((item) => <Skeleton key={item} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {tenderList.map((tender) => <TenderAnalysisPanel key={tender.id} tender={tender} />)}
          {tenderList.length === 0 && <div className="py-16 text-center text-muted-foreground">No tenders to analyze. Add tenders first.</div>}
        </div>
      )}
    </div>
  );
}
