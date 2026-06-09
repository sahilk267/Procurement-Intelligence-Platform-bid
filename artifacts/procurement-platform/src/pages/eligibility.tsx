import { useState } from "react";
import { useCheckEligibility, useGetCompanyProfile, useListTenders } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle, Building2, CheckCircle2, ChevronDown, ChevronUp, XCircle } from "lucide-react";

function EligibilityPanel({ tender }: { tender: any }) {
  const [expanded, setExpanded] = useState(false);
  const { data: eligibility, isLoading } = useCheckEligibility(Number(tender.id), {
    query: { enabled: expanded, queryKey: ["eligibility", tender.id] },
  });
  const isEligible = eligibility?.eligible;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="cursor-pointer pb-3" onClick={() => setExpanded((value) => !value)}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <CardTitle className="line-clamp-2 text-base leading-snug">{tender.title}</CardTitle>
            <CardDescription className="mt-1">{tender.authority} - {tender.source}</CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {tender.estimatedValue && <span className="hidden text-sm font-medium sm:block">{formatCurrency(Number(tender.estimatedValue))}</span>}
            {eligibility && <Badge variant={isEligible ? "default" : "destructive"}>{isEligible ? "Eligible" : "Not Eligible"}</Badge>}
            <Button variant="ghost" size="icon" type="button">
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4 border-t pt-4">
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-12 w-full" />)}</div>
          ) : eligibility ? (
            <>
              <div className={`flex items-center gap-4 rounded-lg border-2 p-4 ${isEligible ? "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950" : "border-red-300 bg-red-50 dark:border-red-700 dark:bg-red-950"}`}>
                {isEligible ? <CheckCircle2 className="h-8 w-8 text-green-700" /> : <XCircle className="h-8 w-8 text-red-700" />}
                <div>
                  <div className="text-lg font-bold">{isEligible ? "Eligible to Bid" : "Not Eligible"}</div>
                  <div className="text-sm text-muted-foreground">Eligibility score: {eligibility.score}/100</div>
                </div>
              </div>

              {(eligibility.criteria || []).length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold">Eligibility Criteria</p>
                  {eligibility.criteria?.map((criterion, index) => (
                    <div key={index} className="flex items-start gap-3 text-sm">
                      {criterion.met ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" /> : <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-500" />}
                      <div>
                        <span className="font-medium">{criterion.name}</span>
                        {criterion.required && <span className="text-muted-foreground"> - Required: {criterion.required}</span>}
                        {criterion.present && <span className="text-muted-foreground"> - Present: {criterion.present}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {(eligibility.gaps || []).length > 0 && (
                <div>
                  <p className="mb-2 flex items-center gap-1.5 text-sm font-semibold text-red-600">
                    <AlertCircle className="h-4 w-4" /> Eligibility Gaps
                  </p>
                  <ul className="space-y-1">
                    {eligibility.gaps?.map((gap, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <span className="mt-0.5 shrink-0 text-red-500">!</span>{gap}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          ) : (
            <div className="py-8 text-center text-muted-foreground">No eligibility data for this tender.</div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

export default function Eligibility() {
  const { data: tenders, isLoading } = useListTenders();
  const { data: profile } = useGetCompanyProfile();
  const tenderList = tenders?.data ?? [];

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Eligibility Matching</h1>
          <p className="text-muted-foreground">Check your company's eligibility for each tender based on your profile.</p>
        </div>
        {profile && (
          <Card className="shrink-0">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="rounded-lg bg-primary/10 p-2">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold">{profile.companyName}</p>
                <p className="text-xs text-muted-foreground">{profile.gstNumber || profile.panNumber || "Profile ready"}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">{[1, 2, 3].map((item) => <Skeleton key={item} className="h-20 w-full" />)}</div>
      ) : (
        <div className="space-y-4">
          {tenderList.map((tender) => <EligibilityPanel key={tender.id} tender={tender} />)}
          {tenderList.length === 0 && <div className="py-16 text-center text-muted-foreground">No tenders to check eligibility for.</div>}
        </div>
      )}
    </div>
  );
}
