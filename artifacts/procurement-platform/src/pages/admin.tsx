import { useState } from "react";
import { useListTenders, useListBids, useListVendors, useGetDashboardStats, useGetCurrentUser } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, Building2, Target, FileText, TrendingUp, ShieldCheck,
  CheckCircle2, AlertCircle, BarChart2, Activity, Briefcase, Search
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend
} from "recharts";

const COLORS = [
  "hsl(var(--chart-1))", "hsl(var(--chart-2))", "hsl(var(--chart-3))",
  "hsl(var(--chart-4))", "hsl(var(--chart-5))"
];

export default function AdminPanel() {
  const { user } = useAuth();
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: tendersResp, isLoading: tendersLoading } = useListTenders({});
  const { data: bidsResp, isLoading: bidsLoading } = useListBids();
  const { data: vendors, isLoading: vendorsLoading } = useListVendors();
  const [search, setSearch] = useState("");

  const tenders = tendersResp?.data || [];
  const bids = bidsResp?.data || [];

  const isAdmin = user?.role === "company_owner" || user?.role === "admin" || user?.role === "super_admin";
  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <ShieldCheck className="h-16 w-16 text-muted-foreground opacity-30" />
        <h2 className="text-xl font-semibold">Access Restricted</h2>
        <p className="text-muted-foreground">Admin panel requires administrator privileges.</p>
      </div>
    );
  }

  const categorySpend = tenders.reduce((acc: Record<string, number>, t) => {
    const cat = t.category || "Other";
    acc[cat] = (acc[cat] || 0) + Number(t.estimatedValue || 0);
    return acc;
  }, {});
  const categoryData: { category: string; value: number }[] = Object.entries(categorySpend)
    .map(([cat, val]) => ({ category: cat, value: val as number }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const stageCount = bids.reduce((acc: Record<string, number>, b) => {
    const s = b.stage as string;
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const stageData: { stage: string; count: number }[] = Object.entries(stageCount).map(([stage, count]) => ({ stage, count: count as number }));

  const sourceCount = tenders.reduce((acc: Record<string, number>, t) => {
    const src = (t.source as string) || "Other";
    acc[src] = (acc[src] || 0) + 1;
    return acc;
  }, {});
  const sourceData: { source: string; count: number }[] = Object.entries(sourceCount).map(([source, count]) => ({ source, count: count as number }));

  const monthlyActivity = [
    { month: "Jan", tenders: 12, bids: 4, wins: 1 },
    { month: "Feb", tenders: 18, bids: 6, wins: 2 },
    { month: "Mar", tenders: 15, bids: 5, wins: 2 },
    { month: "Apr", tenders: 22, bids: 8, wins: 3 },
    { month: "May", tenders: 28, bids: 10, wins: 4 },
    { month: "Jun", tenders: 25, bids: 9, wins: 3 },
  ];

  const filteredTenders = tenders.filter(t =>
    search === "" || t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.authority.toLowerCase().includes(search.toLowerCase())
  );

  const filteredVendors = (vendors || []).filter(v =>
    search === "" || v.companyName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Panel</h1>
          <p className="text-muted-foreground">System overview, analytics, and platform management.</p>
        </div>
        <Badge variant="outline" className="gap-1 text-sm px-3 py-1">
          <ShieldCheck className="h-4 w-4 text-primary" />
          {user?.role?.replace("_", " ")}
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Total Tenders" value={tenders.length} icon={FileText} color="text-blue-500" loading={tendersLoading} sub="In system" />
        <KpiCard title="Active Bids" value={stats?.activeBids} icon={Target} color="text-amber-500" loading={statsLoading} sub="In pipeline" />
        <KpiCard title="Total Pipeline" value={stats?.totalBidValue ? formatCurrency(stats.totalBidValue) : "-"} icon={TrendingUp} color="text-emerald-500" loading={statsLoading} sub="Bid value" />
        <KpiCard title="Win Rate" value={stats?.winRate !== undefined ? `${stats.winRate}%` : "-"} icon={CheckCircle2} color="text-purple-500" loading={statsLoading} sub="Overall success" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <KpiCard title="Vendors & OEMs" value={(vendors || []).length} icon={Building2} color="text-indigo-500" loading={vendorsLoading} sub="In network" />
        <KpiCard title="Open Tenders" value={stats?.openTenders} icon={Activity} color="text-orange-500" loading={statsLoading} sub="Active opportunities" />
        <KpiCard title="Won Bids" value={stats?.wonBids} icon={Briefcase} color="text-green-500" loading={statsLoading} sub="All time" />
        <KpiCard title="Upcoming Deadlines" value={stats?.upcomingDeadlines} icon={AlertCircle} color="text-red-500" loading={statsLoading} sub="Next 7 days" />
      </div>

      <Tabs defaultValue="analytics">
        <TabsList className="mb-4">
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="tenders">Tender Registry</TabsTrigger>
          <TabsTrigger value="vendors">Vendor Registry</TabsTrigger>
          <TabsTrigger value="bids">Bid Overview</TabsTrigger>
        </TabsList>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Monthly Activity Trend</CardTitle>
                <CardDescription>Tenders tracked, bids submitted, and wins per month</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyActivity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="month" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Legend />
                    <Line type="monotone" dataKey="tenders" stroke={COLORS[0]} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="bids" stroke={COLORS[1]} strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="wins" stroke={COLORS[2]} strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Spend by Category</CardTitle>
                <CardDescription>Estimated tender value distribution</CardDescription>
              </CardHeader>
              <CardContent className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis type="number" stroke="hsl(var(--muted-foreground))" fontSize={10}
                      tickFormatter={(v) => v >= 10000000 ? `${(v / 10000000).toFixed(0)}Cr` : v >= 100000 ? `${(v / 100000).toFixed(0)}L` : `${v}`} />
                    <YAxis type="category" dataKey="category" stroke="hsl(var(--muted-foreground))" fontSize={11} width={90} />
                    <RechartsTooltip
                      formatter={(val: number) => [formatCurrency(val), "Value"]}
                      contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }}
                    />
                    <Bar dataKey="value" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Bid Pipeline Stages</CardTitle>
                <CardDescription>Current distribution of bids across stages</CardDescription>
              </CardHeader>
              <CardContent className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stageData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                    <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} />
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Bar dataKey="count" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Tender Sources</CardTitle>
                <CardDescription>Distribution by procurement portal</CardDescription>
              </CardHeader>
              <CardContent className="h-64 flex flex-col items-center justify-center">
                <ResponsiveContainer width="100%" height="80%">
                  <PieChart>
                    <Pie data={sourceData} dataKey="count" nameKey="source" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                      {sourceData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <RechartsTooltip contentStyle={{ backgroundColor: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-3 mt-2">
                  {sourceData.map((s, i) => (
                    <div key={i} className="flex items-center gap-1 text-xs text-muted-foreground">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {s.source.toUpperCase()}: {s.count}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Tenders Tab */}
        <TabsContent value="tenders">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Tender Registry</CardTitle>
                  <CardDescription>All {tenders.length} tenders in the system</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search tenders..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {tendersLoading ? (
                <div className="space-y-2">{[1,2,3,4,5].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Title</TableHead>
                      <TableHead>Authority</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Closing</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTenders.slice(0, 20).map(t => (
                      <TableRow key={t.id}>
                        <TableCell className="max-w-xs">
                          <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                          <p className="text-xs text-muted-foreground">{t.referenceNumber}</p>
                        </TableCell>
                        <TableCell className="text-sm">{t.authority}</TableCell>
                        <TableCell><Badge variant="outline" className="text-xs">{t.category}</Badge></TableCell>
                        <TableCell className="text-sm">{t.estimatedValue ? formatCurrency(Number(t.estimatedValue)) : "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{t.closingDate ? formatDate(t.closingDate) : "-"}</TableCell>
                        <TableCell>
                          <Badge variant={t.status === "open" ? "default" : t.status === "closed" ? "secondary" : "outline"} className="text-xs capitalize">
                            {t.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Vendors Tab */}
        <TabsContent value="vendors">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Vendor Registry</CardTitle>
                  <CardDescription>All {(vendors || []).length} vendors and OEM partners</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search vendors..." className="pl-8" value={search} onChange={e => setSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <div className="space-y-2">{[1,2,3].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Company</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>Rating</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <p className="text-sm font-medium">{v.companyName}</p>
                          <p className="text-xs text-muted-foreground">{v.email}</p>
                        </TableCell>
                        <TableCell className="text-sm">{v.contactName || "-"}</TableCell>
                        <TableCell><Badge variant="outline" className="capitalize text-xs">{v.type}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(v.categories || []).slice(0, 2).map((c, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-medium">{v.rating ? Number(v.rating).toFixed(1) : "-"}</span>
                          <span className="text-muted-foreground text-xs"> /5</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Bids Overview Tab */}
        <TabsContent value="bids">
          <Card>
            <CardHeader>
              <CardTitle>Bid Overview</CardTitle>
              <CardDescription>All {bids.length} bids across all stages</CardDescription>
            </CardHeader>
            <CardContent>
              {bidsLoading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-10 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tender</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Target Value</TableHead>
                      <TableHead>Submission</TableHead>
                      <TableHead>Won Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bids.map(b => (
                      <TableRow key={b.id}>
                        <TableCell className="max-w-xs">
                          <p className="text-sm font-medium line-clamp-1">{b.tender?.title || `Bid #${b.id}`}</p>
                          <p className="text-xs text-muted-foreground">{b.tender?.authority}</p>
                        </TableCell>
                        <TableCell>
                          <Badge variant={b.stage === "won" ? "default" : b.stage === "lost" ? "destructive" : "outline"} className="capitalize text-xs">
                            {b.stage?.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">{b.targetValue ? formatCurrency(Number(b.targetValue)) : "-"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">{b.submissionDate ? formatDate(b.submissionDate) : "-"}</TableCell>
                        <TableCell className="text-sm font-medium text-emerald-600">
                          {b.wonValue ? formatCurrency(Number(b.wonValue)) : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KpiCard({ title, value, icon: Icon, color, loading, sub }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? <Skeleton className="h-8 w-20" /> : (
          <div className="text-2xl font-bold">{value !== undefined && value !== null ? value : "—"}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{sub}</p>
      </CardContent>
    </Card>
  );
}
