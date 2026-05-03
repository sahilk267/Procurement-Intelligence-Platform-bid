import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Link } from "wouter";
import {
  Bookmark, BookmarkCheck, Search, Filter, Building2, MapPin,
  Tag, X, Plus, AlertCircle, Loader2, ExternalLink, BellRing,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

function getToken() {
  return localStorage.getItem("token") ?? "";
}

async function fetchWatchlist(params: Record<string, string>) {
  const token = getToken();
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`/api/tenders/watchlist${qs ? "?" + qs : ""}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to load watchlist");
  return res.json() as Promise<{ data: any[]; total: number }>;
}

async function trackTender(id: number) {
  const token = getToken();
  const res = await fetch(`/api/tenders/${id}/track`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to track tender");
  return res.json();
}

async function runKeywordAlert(payload: {
  keywords: string[];
  source: string;
  category: string;
  closingWithin: string;
  notes: string;
}) {
  const token = getToken();
  const res = await fetch("/api/tenders/watchlist", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error("Failed to run keyword alert");
  return res.json() as Promise<{ keywords: string[]; matchCount: number; matches: any[]; notes: string }>;
}

function getRiskColor(score: string | undefined) {
  if (score === "green") return "bg-emerald-500/10 text-emerald-600 border-emerald-200";
  if (score === "yellow") return "bg-amber-500/10 text-amber-600 border-amber-200";
  if (score === "red") return "bg-red-500/10 text-red-600 border-red-200";
  return "bg-gray-100 text-gray-600";
}

function TenderRow({
  tender,
  onTrack,
  tracking,
  alreadyTracked,
}: {
  tender: any;
  onTrack?: (id: number) => void;
  tracking?: boolean;
  alreadyTracked?: boolean;
}) {
  return (
    <TableRow className="group hover:bg-muted/50 transition-colors">
      <TableCell>
        <div className="space-y-1.5">
          <div className="flex items-start gap-2">
            {(tender.isTracked || alreadyTracked) && (
              <BookmarkCheck className="h-3.5 w-3.5 mt-0.5 flex-shrink-0 text-primary" />
            )}
            <Link
              href={`/tenders/${tender.id}`}
              className="font-semibold text-primary hover:underline line-clamp-2 leading-tight"
            >
              {tender.title}
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span className="flex items-center">
              <Building2 className="mr-1 h-3 w-3" />
              {tender.authority}
            </span>
            {tender.state && (
              <span className="flex items-center">
                <MapPin className="mr-1 h-3 w-3" />
                {tender.state}
              </span>
            )}
            <span className="bg-secondary/20 text-secondary-foreground px-1.5 py-0.5 rounded uppercase tracking-wider">
              {tender.source}
            </span>
            <span>Ref: {tender.referenceNumber || "N/A"}</span>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <div className="font-medium text-sm">
          {tender.estimatedValue ? formatCurrency(tender.estimatedValue) : "Not Disclosed"}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          EMD: {tender.emdAmount ? formatCurrency(tender.emdAmount) : "Nil"}
        </div>
      </TableCell>
      <TableCell>
        <div className="text-sm font-medium text-red-600 dark:text-red-400">
          {formatDate(tender.closingDate)}
        </div>
        <div className="text-xs text-muted-foreground mt-0.5">
          Opens: {formatDate(tender.openingDate)}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={getRiskColor(tender.riskScore)}>
          {tender.riskScore ? tender.riskScore.toUpperCase() : "UNRATED"}
        </Badge>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1">
          {onTrack && !tender.isTracked && !alreadyTracked && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTrack(tender.id)}
              disabled={tracking}
              className="h-7 text-xs"
            >
              {tracking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <>
                  <Bookmark className="h-3 w-3 mr-1" />
                  Track
                </>
              )}
            </Button>
          )}
          {(tender.isTracked || alreadyTracked) && !onTrack && (
            <Badge variant="secondary" className="h-6 text-xs font-normal">
              <BookmarkCheck className="h-3 w-3 mr-1" />
              Tracked
            </Badge>
          )}
          <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
            <Link href={`/tenders/${tender.id}`}>
              <ExternalLink className="h-3 w-3 mr-1" />
              View
            </Link>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

export default function Watchlist() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [q, setQ] = useState("");
  const [category, setCategory] = useState("all");
  const [source, setSource] = useState("all");
  const [status, setStatus] = useState("all");
  const [closingWithin, setClosingWithin] = useState("all");

  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState("");
  const [alertSource, setAlertSource] = useState("all");
  const [alertCategory, setAlertCategory] = useState("all");
  const [alertClosingWithin, setAlertClosingWithin] = useState("all");
  const [alertNotes, setAlertNotes] = useState("");
  const [alertResult, setAlertResult] = useState<{
    keywords: string[];
    matchCount: number;
    matches: any[];
    notes: string;
  } | null>(null);
  const [alertRunning, setAlertRunning] = useState(false);
  const [trackingIds, setTrackingIds] = useState<Set<number>>(new Set());
  const [trackedIds, setTrackedIds] = useState<Set<number>>(new Set());

  const filterParams: Record<string, string> = {};
  if (q) filterParams.q = q;
  if (category !== "all") filterParams.category = category;
  if (source !== "all") filterParams.source = source;
  if (status !== "all") filterParams.status = status;
  if (closingWithin !== "all") filterParams.closingWithin = closingWithin;

  const { data: watchlistData, isLoading: watchlistLoading } = useQuery({
    queryKey: ["watchlist", filterParams],
    queryFn: () => fetchWatchlist(filterParams),
    staleTime: 30_000,
  });

  function addKeyword() {
    const trimmed = keywordInput.trim();
    if (!trimmed || keywords.includes(trimmed)) return;
    setKeywords((prev) => [...prev, trimmed]);
    setKeywordInput("");
  }

  function removeKeyword(kw: string) {
    setKeywords((prev) => prev.filter((k) => k !== kw));
    setAlertResult(null);
  }

  async function runAlert() {
    if (keywords.length === 0) {
      toast({ title: "Add at least one keyword", variant: "destructive" });
      return;
    }
    setAlertRunning(true);
    setAlertResult(null);
    try {
      const result = await runKeywordAlert({
        keywords,
        source: alertSource,
        category: alertCategory,
        closingWithin: alertClosingWithin,
        notes: alertNotes,
      });
      setAlertResult(result);
    } catch {
      toast({ title: "Failed to run keyword alert", variant: "destructive" });
    } finally {
      setAlertRunning(false);
    }
  }

  async function handleTrack(id: number) {
    setTrackingIds((prev) => new Set(prev).add(id));
    try {
      await trackTender(id);
      setTrackedIds((prev) => new Set(prev).add(id));
      queryClient.invalidateQueries({ queryKey: ["watchlist"] });
      toast({
        title: "Tender tracked",
        description: "Added to your watchlist.",
      });
    } catch {
      toast({ title: "Failed to track tender", variant: "destructive" });
    } finally {
      setTrackingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tender Watchlist</h1>
          <p className="text-muted-foreground">
            Track tenders and run keyword alerts to surface matching opportunities.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-sm px-3 py-1">
            <BookmarkCheck className="h-3.5 w-3.5 mr-1.5" />
            {watchlistData?.total ?? 0} tracked
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="tracked">
        <TabsList>
          <TabsTrigger value="tracked" className="gap-2">
            <BookmarkCheck className="h-4 w-4" />
            Tracked Tenders
          </TabsTrigger>
          <TabsTrigger value="alerts" className="gap-2">
            <BellRing className="h-4 w-4" />
            Keyword Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tracked" className="mt-4 space-y-4">
          <Card>
            <CardContent className="p-4 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search tracked tenders..."
                  className="pl-8"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>
              <Select value={source} onValueChange={setSource}>
                <SelectTrigger className="w-full sm:w-[150px]">
                  <SelectValue placeholder="Source" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Sources</SelectItem>
                  <SelectItem value="gem">GeM Portal</SelectItem>
                  <SelectItem value="cppp">CPPP</SelectItem>
                  <SelectItem value="state">State Portals</SelectItem>
                  <SelectItem value="railway">Railways</SelectItem>
                  <SelectItem value="defence">Defence</SelectItem>
                </SelectContent>
              </Select>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger className="w-full sm:w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                  <SelectItem value="awarded">Awarded</SelectItem>
                </SelectContent>
              </Select>
              <Select value={closingWithin} onValueChange={setClosingWithin}>
                <SelectTrigger className="w-full sm:w-[160px]">
                  <SelectValue placeholder="Closing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any closing date</SelectItem>
                  <SelectItem value="7">Closing in 7 days</SelectItem>
                  <SelectItem value="14">Closing in 14 days</SelectItem>
                  <SelectItem value="30">Closing in 30 days</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[40%]">Tender Details</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Closing Date</TableHead>
                    <TableHead>Risk</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {watchlistLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                        <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                        <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                        <TableCell><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                      </TableRow>
                    ))
                  ) : watchlistData?.data?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="h-40 text-center">
                        <div className="flex flex-col items-center gap-2 text-muted-foreground">
                          <Bookmark className="h-8 w-8 opacity-30" />
                          <p className="font-medium">No tracked tenders yet</p>
                          <p className="text-sm">
                            Go to{" "}
                            <Link href="/tenders" className="text-primary underline">
                              Tender Discovery
                            </Link>{" "}
                            and click Track on any tender, or use Keyword Alerts below.
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    watchlistData?.data?.map((tender) => (
                      <TenderRow key={tender.id} tender={tender} />
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            {!watchlistLoading && watchlistData?.total && watchlistData.total > 0 ? (
              <div className="p-4 border-t text-sm text-muted-foreground">
                Showing {watchlistData.data.length} of {watchlistData.total} tracked tenders
              </div>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Configure Keyword Alert</CardTitle>
              <CardDescription>
                Enter keywords to search across tender titles and authorities. Optionally filter by source, category, or deadline.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Keywords</label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Tag className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder='e.g. "solar", "construction", "IT infrastructure"'
                      className="pl-8"
                      value={keywordInput}
                      onChange={(e) => setKeywordInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") { e.preventDefault(); addKeyword(); }
                      }}
                    />
                  </div>
                  <Button variant="outline" onClick={addKeyword} type="button">
                    <Plus className="h-4 w-4 mr-1" />
                    Add
                  </Button>
                </div>
                {keywords.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {keywords.map((kw) => (
                      <Badge key={kw} variant="secondary" className="gap-1.5 pr-1 text-sm">
                        <Tag className="h-3 w-3" />
                        {kw}
                        <button
                          onClick={() => removeKeyword(kw)}
                          className="ml-0.5 rounded-full hover:bg-muted p-0.5 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Source</label>
                  <Select value={alertSource} onValueChange={setAlertSource}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Sources" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Sources</SelectItem>
                      <SelectItem value="gem">GeM Portal</SelectItem>
                      <SelectItem value="cppp">CPPP</SelectItem>
                      <SelectItem value="state">State Portals</SelectItem>
                      <SelectItem value="railway">Railways</SelectItem>
                      <SelectItem value="defence">Defence</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Category</label>
                  <Select value={alertCategory} onValueChange={setAlertCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      <SelectItem value="goods">Goods</SelectItem>
                      <SelectItem value="works">Works</SelectItem>
                      <SelectItem value="services">Services</SelectItem>
                      <SelectItem value="consultancy">Consultancy</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block">Closing Within</label>
                  <Select value={alertClosingWithin} onValueChange={setAlertClosingWithin}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any date" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any date</SelectItem>
                      <SelectItem value="7">7 days</SelectItem>
                      <SelectItem value="14">14 days</SelectItem>
                      <SelectItem value="30">30 days</SelectItem>
                      <SelectItem value="60">60 days</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-1.5 block">Notes (optional)</label>
                <Input
                  placeholder="e.g. Q2 infrastructure pipeline"
                  value={alertNotes}
                  onChange={(e) => setAlertNotes(e.target.value)}
                />
              </div>

              <Button
                className="w-full sm:w-auto"
                onClick={runAlert}
                disabled={alertRunning || keywords.length === 0}
              >
                {alertRunning ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Run Keyword Alert
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {alertResult && (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BellRing className="h-4 w-4 text-primary" />
                      Alert Results
                    </CardTitle>
                    <CardDescription className="mt-0.5">
                      Keywords:{" "}
                      {alertResult.keywords.map((k) => (
                        <Badge key={k} variant="outline" className="mr-1 text-xs">
                          {k}
                        </Badge>
                      ))}
                    </CardDescription>
                  </div>
                  <Badge
                    variant={alertResult.matchCount > 0 ? "default" : "secondary"}
                    className="text-sm px-3"
                  >
                    {alertResult.matchCount} match{alertResult.matchCount !== 1 ? "es" : ""}
                  </Badge>
                </div>
              </CardHeader>
              {alertResult.matchCount === 0 ? (
                <CardContent>
                  <div className="flex flex-col items-center gap-2 py-6 text-muted-foreground">
                    <AlertCircle className="h-8 w-8 opacity-40" />
                    <p className="font-medium">No matching tenders found</p>
                    <p className="text-sm text-center">
                      Try broader keywords or remove the source/category filters.
                    </p>
                  </div>
                </CardContent>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40%]">Tender Details</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Closing Date</TableHead>
                        <TableHead>Risk</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {alertResult.matches.map((tender) => (
                        <TenderRow
                          key={tender.id}
                          tender={tender}
                          onTrack={handleTrack}
                          tracking={trackingIds.has(tender.id)}
                          alreadyTracked={trackedIds.has(tender.id)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
              {alertResult.matchCount > alertResult.matches.length && (
                <div className="p-3 border-t text-xs text-muted-foreground text-center">
                  Showing top {alertResult.matches.length} of {alertResult.matchCount} matches
                </div>
              )}
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
