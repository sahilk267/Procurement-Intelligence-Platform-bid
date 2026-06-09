import { useListCompetitors } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Target, Award } from "lucide-react";

export default function Competitors() {
  const { data: competitors, isLoading } = useListCompetitors();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Competitor Intelligence</h1>
        <p className="text-muted-foreground">Track competitor activity, win rates, and market positioning.</p>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-48 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(competitors || []).map((comp) => (
            <Card key={comp.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-base">{comp.companyName}</CardTitle>
                    {comp.category && (
                      <CardDescription className="capitalize">{comp.category.replace("_", " ")}</CardDescription>
                    )}
                  </div>
                  <Badge variant="secondary" className="capitalize">{comp.authority || "Tracked"}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {comp.year !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Award className="h-3.5 w-3.5" />
                        Year
                      </div>
                      <div className="text-xl font-bold">{comp.year}</div>
                    </div>
                  )}
                  {comp.tenderTitle && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Target className="h-3.5 w-3.5" />
                        Tender
                      </div>
                      <div className="text-sm font-bold line-clamp-2">{comp.tenderTitle}</div>
                    </div>
                  )}
                </div>

                {comp.notes && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Notes</p>
                    <p className="text-sm text-muted-foreground">{comp.notes}</p>
                  </div>
                )}

                {comp.awardedAmount && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Awarded Amount</span>
                    <span className="font-medium">{formatCurrency(Number(comp.awardedAmount))}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!competitors || competitors.length === 0) && (
            <div className="col-span-full text-center text-muted-foreground py-16">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No competitor data available.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
