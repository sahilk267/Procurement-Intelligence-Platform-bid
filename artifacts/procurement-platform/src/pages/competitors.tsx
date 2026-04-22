import { useListCompetitors } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, TrendingUp, Target, Award } from "lucide-react";

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
                    <CardTitle className="text-base">{comp.name}</CardTitle>
                    {comp.type && (
                      <CardDescription className="capitalize">{comp.type.replace("_", " ")}</CardDescription>
                    )}
                  </div>
                  {comp.threatLevel && (
                    <Badge variant={comp.threatLevel === "high" ? "destructive" : comp.threatLevel === "medium" ? "outline" : "secondary"} className="capitalize">
                      {comp.threatLevel} threat
                    </Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  {comp.winRate !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Award className="h-3.5 w-3.5" />
                        Win Rate
                      </div>
                      <div className="text-xl font-bold">{(comp.winRate * 100).toFixed(0)}%</div>
                    </div>
                  )}
                  {comp.totalBidsWon !== undefined && (
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
                        <Target className="h-3.5 w-3.5" />
                        Bids Won
                      </div>
                      <div className="text-xl font-bold">{comp.totalBidsWon}</div>
                    </div>
                  )}
                </div>

                {comp.strengths && comp.strengths.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Key Strengths</p>
                    <div className="flex flex-wrap gap-1">
                      {comp.strengths.map((s: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {comp.weaknesses && comp.weaknesses.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Weaknesses</p>
                    <div className="flex flex-wrap gap-1">
                      {comp.weaknesses.map((w: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">{w}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {comp.averageBidValue && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Avg Bid Value</span>
                    <span className="font-medium">{formatCurrency(comp.averageBidValue)}</span>
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
