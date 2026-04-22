import { useState } from "react";
import { useListTenders, useCheckEligibility, useGetCompanyProfile } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, ChevronDown, ChevronUp, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

function EligibilityPanel({ tender }: { tender: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: eligibility, isLoading } = useCheckEligibility(
    { pathParams: { tenderId: tender.id } },
    { enabled: expanded }
  );

  const isEligible = eligibility?.eligible;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base line-clamp-2 leading-snug">{tender.title}</CardTitle>
            <CardDescription className="mt-1">
              {tender.organisation} · {tender.source}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {tender.estimatedValue && (
              <span className="font-medium text-sm hidden sm:block">{formatCurrency(tender.estimatedValue)}</span>
            )}
            {eligibility && (
              <Badge variant={isEligible ? "default" : "destructive"}>
                {isEligible ? "Eligible" : "Not Eligible"}
              </Badge>
            )}
            <Button variant="ghost" size="icon">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="border-t pt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1,2,3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
            </div>
          ) : eligibility ? (
            <>
              <div className={`rounded-xl p-4 flex items-center gap-4 border-2 ${isEligible ? "bg-green-50 border-green-300 dark:bg-green-950 dark:border-green-700" : "bg-red-50 border-red-300 dark:bg-red-950 dark:border-red-700"}`}>
                <div className={`rounded-full p-2 ${isEligible ? "bg-green-200 dark:bg-green-800" : "bg-red-200 dark:bg-red-800"}`}>
                  {isEligible ? <CheckCircle2 className="h-6 w-6 text-green-700 dark:text-green-300" /> : <XCircle className="h-6 w-6 text-red-700 dark:text-red-300" />}
                </div>
                <div>
                  <div className="font-bold text-lg">{isEligible ? "Eligible to Bid" : "Not Eligible"}</div>
                  {eligibility.score !== undefined && (
                    <div className="text-sm text-muted-foreground">Eligibility score: {eligibility.score}/100</div>
                  )}
                </div>
              </div>

              {eligibility.criteria && eligibility.criteria.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Eligibility Criteria</p>
                  {eligibility.criteria.map((criterion: any, i: number) => (
                    <div key={i} className="flex items-start gap-3 text-sm">
                      {criterion.met ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <span className="font-medium">{criterion.name}</span>
                        {criterion.required && <span className="text-muted-foreground"> — Required: {criterion.required}</span>}
                        {criterion.actual && <span className="text-muted-foreground"> · Actual: {criterion.actual}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {eligibility.gaps && eligibility.gaps.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-600 mb-2 flex items-center gap-1.5">
                    <AlertCircle className="h-4 w-4" />Eligibility Gaps
                  </p>
                  <ul className="space-y-1">
                    {eligibility.gaps.map((gap: string, i: number) => (
                      <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                        <span className="text-red-500 mt-0.5 shrink-0">!</span>{gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="text-center text-muted-foreground py-8">No eligibility data for this tender.</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function Eligibility() {
  const { data: tenders, isLoading } = useListTenders();
  const { data: profile } = useGetCompanyProfile();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Eligibility Matching</h1>
          <p className="text-muted-foreground">Check your company's eligibility for each tender based on your profile.</p>
        </div>
        {profile && (
          <Card className="shrink-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="bg-primary/10 rounded-lg p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{profile.name}</p>
                <p className="text-xs text-muted-foreground">{profile.registrationNumber}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      ) : (
        <div className="space-y-4">
          {(tenders || []).map((tender) => (
            <EligibilityPanel key={tender.id} tender={tender} />
          ))}
          {(!tenders || tenders.length === 0) && (
            <div className="text-center text-muted-foreground py-16">No tenders to check eligibility for.</div>
          )}
        </div>
      )}
    </div>
  );
}
