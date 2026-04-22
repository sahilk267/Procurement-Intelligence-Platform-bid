import { useListClarifications } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, HelpCircle, CheckCircle2, Clock } from "lucide-react";

const STATUS_VARIANTS: Record<string, any> = {
  pending: "outline",
  answered: "default",
  escalated: "destructive",
  closed: "secondary",
};

const STATUS_ICONS: Record<string, any> = {
  pending: Clock,
  answered: CheckCircle2,
  escalated: HelpCircle,
  closed: CheckCircle2,
};

export default function Clarifications() {
  const { data: clarifications, isLoading } = useListClarifications();

  const pending = (clarifications || []).filter(c => c.status === "pending" || c.status === "escalated");
  const answered = (clarifications || []).filter(c => c.status === "answered" || c.status === "closed");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Clarifications</h1>
        <p className="text-muted-foreground">Manage pre-bid queries, RFI responses, and tender clarifications.</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Pending */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Awaiting Response</h2>
              <Badge variant="destructive" className="text-xs">{pending.length}</Badge>
            </div>
            {pending.map((item) => (
              <ClarificationCard key={item.id} item={item} />
            ))}
            {pending.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-xl">
                <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-green-500 opacity-60" />
                No pending clarifications
              </div>
            )}
          </div>

          {/* Answered */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <h2 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">Resolved</h2>
              <Badge variant="secondary" className="text-xs">{answered.length}</Badge>
            </div>
            {answered.map((item) => (
              <ClarificationCard key={item.id} item={item} />
            ))}
            {answered.length === 0 && (
              <div className="text-center text-muted-foreground py-8 bg-muted/30 rounded-xl">
                No resolved clarifications
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ClarificationCard({ item }: { item: any }) {
  const StatusIcon = STATUS_ICONS[item.status] || MessageSquare;
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardContent className="p-4 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <StatusIcon className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <p className="text-sm font-medium leading-snug">{item.question}</p>
          </div>
          <Badge variant={STATUS_VARIANTS[item.status] || "outline"} className="capitalize shrink-0">
            {item.status}
          </Badge>
        </div>
        {item.answer && (
          <div className="bg-muted rounded-lg p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">Official Response</p>
            <p className="text-sm">{item.answer}</p>
          </div>
        )}
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>Asked: {formatDate(item.createdAt)}</span>
          {item.answeredAt && <span>Answered: {formatDate(item.answeredAt)}</span>}
          {item.source && <Badge variant="outline" className="text-[10px] px-1 py-0 capitalize">{item.source}</Badge>}
        </div>
      </CardContent>
    </Card>
  );
}
