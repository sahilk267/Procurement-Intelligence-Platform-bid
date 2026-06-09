import { useListProposals } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { FileText, Calendar } from "lucide-react";

const STATUS_VARIANT: Record<string, any> = {
  draft: "secondary",
  review: "outline",
  approved: "default",
  submitted: "default",
  won: "default",
  lost: "destructive",
};

export default function Proposals() {
  const { data: proposals, isLoading } = useListProposals();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Proposals</h1>
        <p className="text-muted-foreground">Manage and track all proposal documents for active bids.</p>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[1,2,3].map(i => <Skeleton key={i} className="h-28 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(proposals || []).map((proposal) => (
            <Card key={proposal.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="bg-primary/10 rounded-lg p-2 shrink-0">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant={STATUS_VARIANT[proposal.status] || "outline"} className="capitalize">
                    {proposal.status}
                  </Badge>
                </div>
                <CardTitle className="text-base leading-snug mt-2 line-clamp-2">{proposal.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {proposal.version && (
                  <div className="text-xs text-muted-foreground">Version {proposal.version}</div>
                )}
                {proposal.createdAt && (
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    Created: {formatDate(proposal.createdAt)}
                  </div>
                )}
                {proposal.content && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Badge variant="secondary" className="text-[10px] font-normal">{proposal.type}</Badge>
                    <Badge variant="outline" className="text-[10px] font-normal">Draft content ready</Badge>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!proposals || proposals.length === 0) && (
            <div className="col-span-full text-center text-muted-foreground py-16">No proposals found.</div>
          )}
        </div>
      )}
    </div>
  );
}
