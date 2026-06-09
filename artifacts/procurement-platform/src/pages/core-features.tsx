import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  BellRing,
  BookOpenCheck,
  Bot,
  BriefcaseBusiness,
  CalendarClock,
  FileArchive,
  FileText,
  KanbanSquare,
  Loader2,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Target,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { formatDate } from "@/lib/format";

type CoreDashboard = {
  monitoring: {
    activeRules: number;
    rules: MonitoringRule[];
    recentMatches: Tender[];
  };
  aiSummary: Tender[];
  goNoGo: Array<{ tenderId: number; title: string; score: number; decision: "bid" | "skip" | "review" }>;
  eligibility: {
    profileComplete: boolean;
    documentsAvailable: number;
    expiringDocuments: number;
    certifications: string[];
  };
  documents: {
    total: number;
    expiringDocuments: number;
    categories: Record<string, number>;
  };
  bids: {
    stageCounts: Record<string, number>;
    active: number;
  };
  proposals: {
    total: number;
    recent: Array<{ id: number; title: string; type: string; status: string; createdAt?: string }>;
    templates: string[];
  };
};

type MonitoringRule = {
  id: number;
  name: string;
  keywords: string[];
  sources?: string[];
  categories?: string[];
  states?: string[];
  authorities?: string[];
  isActive: boolean;
  lastRunAt?: string;
};

type Tender = {
  id: number;
  title: string;
  authority: string;
  source: string;
  category: string;
  closingDate?: string;
  estimatedValue?: number | string;
  aiSummary?: string;
  riskScore?: string;
};

type SummaryResult = {
  scopeSummary: string;
  eligibilityCriteria: string;
  importantDates: Array<{ label: string; date?: string }>;
  emdSecurity: string;
  paymentTerms: string;
  penaltyClauses: string;
  hiddenRiskClauses: string[];
  riskScore: string;
};

function authHeaders() {
  return {
    Authorization: `Bearer ${localStorage.getItem("token") ?? ""}`,
    "Content-Type": "application/json",
  };
}

async function apiJson<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...init?.headers },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || "Request failed");
  }
  return res.json();
}

const featureCards = [
  { label: "Tender Auto-Monitoring", icon: BellRing, href: "/watchlist" },
  { label: "AI Tender Summary", icon: Bot, href: "/analysis" },
  { label: "Go / No-Go Engine", icon: Target, href: "/analysis" },
  { label: "Eligibility Matcher", icon: ShieldCheck, href: "/eligibility" },
  { label: "Document Vault", icon: FileArchive, href: "/documents" },
  { label: "Bid Workflow", icon: KanbanSquare, href: "/bids" },
  { label: "Proposal Generator", icon: FileText, href: "/proposals" },
];

const stageLabels: Record<string, string> = {
  shortlisted: "Shortlisted",
  in_progress: "In Progress",
  submitted: "Submitted",
  won: "Won",
  lost: "Lost",
  dropped: "Dropped",
};

export default function CoreFeatures() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [ruleName, setRuleName] = useState("Infrastructure opportunities");
  const [keywords, setKeywords] = useState("electrical, solar, IT");
  const [tenderId, setTenderId] = useState("");
  const [bidId, setBidId] = useState("");
  const [proposalType, setProposalType] = useState("technical");
  const [summary, setSummary] = useState<SummaryResult | null>(null);
  const [monitorMatches, setMonitorMatches] = useState<Tender[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["core-features-dashboard"],
    queryFn: () => apiJson<CoreDashboard>("/api/core-features/dashboard"),
  });

  const createRule = useMutation({
    mutationFn: () => apiJson<MonitoringRule>("/api/core-features/monitoring-rules", {
      method: "POST",
      body: JSON.stringify({
        name: ruleName,
        keywords: keywords.split(",").map((item) => item.trim()).filter(Boolean),
        sources: ["gem", "cppp", "state", "railway", "defence", "municipal", "private"],
      }),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["core-features-dashboard"] });
      toast({ title: "Monitoring rule added" });
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });

  const runRule = useMutation({
    mutationFn: (id: number) => apiJson<{ matches: Tender[]; matchCount: number }>(`/api/core-features/monitoring-rules/${id}/run`, { method: "POST" }),
    onSuccess: (result) => {
      setMonitorMatches(result.matches);
      queryClient.invalidateQueries({ queryKey: ["core-features-dashboard"] });
      toast({ title: `${result.matchCount} tender matches found` });
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });

  const generateSummary = useMutation({
    mutationFn: () => apiJson<SummaryResult>(`/api/core-features/tenders/${Number(tenderId)}/summary`, { method: "POST" }),
    onSuccess: (result) => {
      setSummary(result);
      queryClient.invalidateQueries({ queryKey: ["core-features-dashboard"] });
      toast({ title: "AI tender summary generated" });
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });

  const generateProposal = useMutation({
    mutationFn: () => apiJson<{ id: number; title: string }>("/api/core-features/proposals/generate", {
      method: "POST",
      body: JSON.stringify({ bidId: Number(bidId), type: proposalType }),
    }),
    onSuccess: (proposal) => {
      queryClient.invalidateQueries({ queryKey: ["core-features-dashboard"] });
      toast({ title: "Proposal draft generated", description: proposal.title });
    },
    onError: (error: Error) => toast({ title: error.message, variant: "destructive" }),
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Core Features</h1>
          <p className="text-muted-foreground">Run the procurement workflow from discovery to proposal draft.</p>
        </div>
        <Badge variant="secondary" className="w-fit gap-2 px-3 py-1">
          <Sparkles className="h-3.5 w-3.5" />
          {featureCards.length} modules connected
        </Badge>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        {featureCards.map((feature) => (
          <Link key={feature.label} href={feature.href}>
            <Card className="h-full transition-shadow hover:shadow-md">
              <CardContent className="flex h-full flex-col gap-3 p-4">
                <feature.icon className="h-5 w-5 text-primary" />
                <p className="text-sm font-medium leading-snug">{feature.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <Tabs defaultValue="monitoring" className="space-y-4">
        <TabsList className="flex h-auto flex-wrap justify-start">
          <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          <TabsTrigger value="summary">AI Summary</TabsTrigger>
          <TabsTrigger value="decision">Go / No-Go</TabsTrigger>
          <TabsTrigger value="eligibility">Eligibility</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="workflow">Bids</TabsTrigger>
          <TabsTrigger value="proposals">Proposals</TabsTrigger>
        </TabsList>

        <TabsContent value="monitoring" className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Tender Auto-Monitoring</CardTitle>
              <CardDescription>Save keywords and run matches across tender sources.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={ruleName} onChange={(e) => setRuleName(e.target.value)} placeholder="Rule name" />
              <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder="Comma separated keywords" />
              <Button onClick={() => createRule.mutate()} disabled={createRule.isPending} className="w-full">
                {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Add Monitoring Rule
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Saved Rules</CardTitle>
              <CardDescription>{data?.monitoring.activeRules ?? 0} active rules</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {isLoading ? <p className="text-sm text-muted-foreground">Loading rules...</p> : data?.monitoring.rules.length ? (
                data.monitoring.rules.map((rule) => (
                  <div key={rule.id} className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-sm text-muted-foreground">{rule.keywords?.join(", ") || "No keywords"}</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => runRule.mutate(rule.id)} disabled={runRule.isPending}>
                      <Search className="h-4 w-4" />
                      Run
                    </Button>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">No monitoring rules yet.</p>
              )}
              {monitorMatches.length > 0 && (
                <div className="rounded-lg bg-muted/50 p-3">
                  <p className="mb-2 text-sm font-medium">Latest matches</p>
                  <div className="space-y-2">
                    {monitorMatches.slice(0, 5).map((tender) => (
                      <Link key={tender.id} href={`/tenders/${tender.id}`} className="block rounded-md border bg-background p-2 text-sm hover:bg-muted">
                        <span className="font-medium">{tender.title}</span>
                        <span className="block text-xs text-muted-foreground">{tender.authority} · {tender.source}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">AI Tender Summary</CardTitle>
              <CardDescription>Generate scope, eligibility, date, EMD, payment, penalty, and hidden-clause summaries.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={tenderId} onChange={(e) => setTenderId(e.target.value)} placeholder="Tender ID" inputMode="numeric" />
              <Button onClick={() => generateSummary.mutate()} disabled={!tenderId || generateSummary.isPending} className="w-full">
                {generateSummary.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                Generate Summary
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary Output</CardTitle>
              <CardDescription>Recent analyzed tenders: {data?.aiSummary.length ?? 0}</CardDescription>
            </CardHeader>
            <CardContent>
              {summary ? (
                <div className="grid gap-3 md:grid-cols-2">
                  <Insight title="Scope summary" text={summary.scopeSummary} />
                  <Insight title="Eligibility criteria" text={summary.eligibilityCriteria} />
                  <Insight title="EMD/security" text={summary.emdSecurity} />
                  <Insight title="Payment terms" text={summary.paymentTerms} />
                  <Insight title="Penalty clauses" text={summary.penaltyClauses} />
                  <Insight title="Hidden risk clauses" text={summary.hiddenRiskClauses.join("; ")} />
                </div>
              ) : (
                <RecentTenders tenders={data?.aiSummary ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decision" className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {(data?.goNoGo ?? []).map((item) => (
            <Card key={item.tenderId}>
              <CardHeader>
                <CardTitle className="line-clamp-2 text-base">{item.title}</CardTitle>
                <CardDescription>Bid score {item.score}%</CardDescription>
              </CardHeader>
              <CardContent className="flex items-center justify-between">
                <Badge variant={item.decision === "bid" ? "default" : item.decision === "skip" ? "destructive" : "secondary"}>
                  {item.decision.toUpperCase()}
                </Badge>
                <Button asChild variant="outline" size="sm">
                  <Link href="/analysis">Review</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="eligibility" className="grid gap-4 md:grid-cols-3">
          <Metric title="Company Profile" value={data?.eligibility.profileComplete ? "Ready" : "Incomplete"} icon={ShieldCheck} />
          <Metric title="Documents Available" value={String(data?.eligibility.documentsAvailable ?? 0)} icon={FileArchive} />
          <Metric title="Expiring Documents" value={String(data?.eligibility.expiringDocuments ?? 0)} icon={CalendarClock} />
        </TabsContent>

        <TabsContent value="documents" className="grid gap-4 md:grid-cols-3">
          <Metric title="Vault Documents" value={String(data?.documents.total ?? 0)} icon={FileArchive} />
          <Metric title="Expiry Alerts" value={String(data?.documents.expiringDocuments ?? 0)} icon={CalendarClock} />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              {Object.entries(data?.documents.categories ?? {}).map(([category, count]) => (
                <Badge key={category} variant="outline">{category}: {count}</Badge>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="workflow" className="grid gap-4 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(stageLabels).map(([stage, label]) => (
            <Metric key={stage} title={label} value={String(data?.bids.stageCounts[stage] ?? 0)} icon={BriefcaseBusiness} />
          ))}
        </TabsContent>

        <TabsContent value="proposals" className="grid gap-4 lg:grid-cols-[360px_1fr]">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Proposal Generator</CardTitle>
              <CardDescription>Create cover letter, technical proposal, compliance matrix, deviation, company intro, and past experience drafts.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input value={bidId} onChange={(e) => setBidId(e.target.value)} placeholder="Bid ID" inputMode="numeric" />
              <Input value={proposalType} onChange={(e) => setProposalType(e.target.value)} placeholder="technical, cover_letter, compliance_matrix..." />
              <Button onClick={() => generateProposal.mutate()} disabled={!bidId || generateProposal.isPending} className="w-full">
                {generateProposal.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpenCheck className="h-4 w-4" />}
                Generate Proposal
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Drafts</CardTitle>
              <CardDescription>{data?.proposals.total ?? 0} proposals in workspace</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {(data?.proposals.recent ?? []).map((proposal) => (
                <div key={proposal.id} className="rounded-lg border p-3">
                  <p className="font-medium">{proposal.title}</p>
                  <p className="text-sm text-muted-foreground">{proposal.type} · {proposal.status} · {formatDate(proposal.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Insight({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-lg border p-3">
      <p className="mb-1 text-sm font-medium">{title}</p>
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function RecentTenders({ tenders }: { tenders: Tender[] }) {
  if (tenders.length === 0) {
    return <p className="text-sm text-muted-foreground">Generate a summary for any tender ID to populate this section.</p>;
  }
  return (
    <div className="space-y-3">
      {tenders.map((tender) => (
        <Link key={tender.id} href={`/tenders/${tender.id}`} className="block rounded-lg border p-3 hover:bg-muted">
          <p className="font-medium">{tender.title}</p>
          <p className="text-sm text-muted-foreground">{tender.aiSummary}</p>
        </Link>
      ))}
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: string; icon: LucideIcon }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-4">
        <div>
          <p className="text-sm text-muted-foreground">{title}</p>
          <p className="text-2xl font-semibold">{value}</p>
        </div>
        <Icon className="h-5 w-5 text-primary" />
      </CardContent>
    </Card>
  );
}
