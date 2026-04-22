import { useGetDashboardStats, useGetBidPipelineSummary, useGetTenderTrends, useGetRecentActivity, useGetUpcomingDeadlines } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Target, FileText, CheckCircle2, TrendingUp, AlertCircle, Clock, Search, FolderOpen } from "lucide-react";
import { Link } from "wouter";

export default function Dashboard() {
  const { data: stats, isLoading: statsLoading } = useGetDashboardStats();
  const { data: pipeline, isLoading: pipelineLoading } = useGetBidPipelineSummary();
  const { data: trends, isLoading: trendsLoading } = useGetTenderTrends();
  const { data: activity, isLoading: activityLoading } = useGetRecentActivity();
  const { data: deadlines, isLoading: deadlinesLoading } = useGetUpcomingDeadlines();

  const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Command Center</h1>
          <p className="text-muted-foreground">Overview of your procurement operations and bid pipeline.</p>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard 
          title="Active Bids" 
          value={stats?.activeBids} 
          icon={Target} 
          loading={statsLoading} 
          desc="Currently in progress"
          color="text-blue-500"
        />
        <StatCard 
          title="Total Pipeline Value" 
          value={stats?.totalBidValue ? formatCurrency(stats.totalBidValue) : undefined} 
          icon={TrendingUp} 
          loading={statsLoading} 
          desc="Expected revenue"
          color="text-emerald-500"
        />
        <StatCard 
          title="Win Rate" 
          value={stats?.winRate !== undefined ? `${(stats.winRate * 100).toFixed(1)}%` : undefined} 
          icon={CheckCircle2} 
          loading={statsLoading} 
          desc="Overall success rate"
          color="text-amber-500"
        />
        <StatCard 
          title="Upcoming Deadlines" 
          value={stats?.upcomingDeadlines} 
          icon={Clock} 
          loading={statsLoading} 
          desc="Within next 7 days"
          color="text-red-500"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Pipeline Chart */}
        <Card className="lg:col-span-4">
          <CardHeader>
            <CardTitle>Bid Pipeline Stage</CardTitle>
            <CardDescription>Current status of all active and past bids</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {pipelineLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={pipeline?.stages || []}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="stage" stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}`} />
                    <RechartsTooltip cursor={{fill: 'hsl(var(--muted))'}} contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))'}} />
                    <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Source Distribution */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Tender Sources</CardTitle>
            <CardDescription>Distribution of tracked tenders by portal</CardDescription>
          </CardHeader>
          <CardContent>
            {trendsLoading ? (
              <Skeleton className="h-[300px] w-full" />
            ) : (
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={trends?.bySource || []}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="count"
                      nameKey="source"
                    >
                      {(trends?.bySource || []).map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', color: 'hsl(var(--foreground))'}} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap justify-center gap-2 mt-4">
                  {(trends?.bySource || []).map((entry, index) => (
                    <div key={index} className="flex items-center text-xs text-muted-foreground">
                      <span className="w-3 h-3 rounded-full mr-1" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                      {entry.source}: {entry.count}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest updates across your team</CardDescription>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="space-y-4">
                {[1,2,3,4].map(i => <Skeleton key={i} className="h-12 w-full" />)}
              </div>
            ) : (
              <div className="space-y-6">
                {(activity || []).map((item) => (
                  <div key={item.id} className="flex gap-4">
                    <div className="mt-0.5 bg-muted p-2 rounded-full h-fit">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">{item.description}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        {item.entityName && <span className="font-medium text-foreground mr-2">{item.entityName}</span>}
                        {formatDate(item.createdAt)}
                      </div>
                    </div>
                  </div>
                ))}
                {(!activity || activity.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4">No recent activity</div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming Deadlines */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Critical Deadlines</CardTitle>
              <CardDescription>Upcoming dates requiring attention</CardDescription>
            </div>
            <Link href="/calendar" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent>
            {deadlinesLoading ? (
              <div className="space-y-4">
                {[1,2,3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
              </div>
            ) : (
              <div className="space-y-4">
                {(deadlines || []).map((deadline) => (
                  <div key={deadline.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium line-clamp-1">{deadline.tenderTitle}</p>
                      <div className="flex items-center text-xs text-muted-foreground gap-2">
                        <Badge variant="outline" className="capitalize font-normal text-[10px] px-1 py-0">{deadline.type.replace('_', ' ')}</Badge>
                        <span>{formatDate(deadline.date)}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge variant={deadline.urgency === 'critical' ? 'destructive' : deadline.urgency === 'high' ? 'warning' : 'secondary'}>
                        {deadline.daysRemaining} days
                      </Badge>
                    </div>
                  </div>
                ))}
                {(!deadlines || deadlines.length === 0) && (
                  <div className="text-center text-sm text-muted-foreground py-4 flex flex-col items-center justify-center">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500 mb-2 opacity-50" />
                    No upcoming deadlines in the next 7 days
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, loading, desc, color }: any) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-20" />
        ) : (
          <div className="text-2xl font-bold">{value !== undefined ? value : '-'}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{desc}</p>
      </CardContent>
    </Card>
  );
}