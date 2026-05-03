import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import {
  Bell, AlertTriangle, Clock, FileWarning, Target,
  Calendar, FileText, CheckCircle2, ChevronRight, Filter
} from "lucide-react";
import { Link } from "wouter";

async function fetchNotifications() {
  const token = localStorage.getItem("token");
  const res = await fetch("/api/notifications", {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch notifications");
  return res.json();
}

const TYPE_META: Record<string, { icon: any; label: string; color: string; bgColor: string }> = {
  tender_deadline: {
    icon: Clock,
    label: "Tender Deadline",
    color: "text-amber-600",
    bgColor: "bg-amber-50 dark:bg-amber-950/50",
  },
  document_expired: {
    icon: FileWarning,
    label: "Expired Document",
    color: "text-red-600",
    bgColor: "bg-red-50 dark:bg-red-950/50",
  },
  document_expiry: {
    icon: FileText,
    label: "Document Expiring",
    color: "text-orange-600",
    bgColor: "bg-orange-50 dark:bg-orange-950/50",
  },
  stale_bid: {
    icon: Target,
    label: "Stale Bid",
    color: "text-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/50",
  },
};

const SEVERITY_BADGE: Record<string, { label: string; className: string }> = {
  urgent: { label: "Urgent", className: "bg-red-100 text-red-700 border-red-300 dark:bg-red-900/30 dark:text-red-400" },
  warning: { label: "Warning", className: "bg-amber-100 text-amber-700 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400" },
  info: { label: "Info", className: "bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900/30 dark:text-blue-400" },
};

function NotificationCard({ n }: { n: any }) {
  const meta = TYPE_META[n.type] || TYPE_META.stale_bid;
  const sev = SEVERITY_BADGE[n.severity];

  return (
    <Link href={n.link}>
      <div className={`flex items-start gap-4 p-4 rounded-xl border border-border hover:shadow-md transition-all cursor-pointer ${meta.bgColor}`}>
        <div className={`p-2 rounded-full bg-background border border-border shrink-0`}>
          <meta.icon className={`h-4 w-4 ${meta.color}`} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-semibold">{n.title}</p>
            <Badge variant="outline" className={`text-[10px] px-1.5 py-0 shrink-0 ${sev.className}`}>
              {sev.label}
            </Badge>
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0 text-muted-foreground">
              {meta.label}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
          {n.date && (
            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {n.type.includes("tender") || n.type.includes("document")
                ? `Date: ${formatDate(n.date)}`
                : `Last updated: ${formatDate(n.date)}`}
            </p>
          )}
        </div>
        <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
      </div>
    </Link>
  );
}

export default function Notifications() {
  const { data, isLoading } = useQuery({ queryKey: ["notifications"], queryFn: fetchNotifications, refetchInterval: 60_000 });
  const [tab, setTab] = useState("all");

  const notifications: any[] = data?.data || [];
  const counts = data?.counts || { urgent: 0, warning: 0, info: 0 };

  const filtered = tab === "all"
    ? notifications
    : tab === "urgent"
    ? notifications.filter(n => n.severity === "urgent")
    : tab === "tenders"
    ? notifications.filter(n => n.type === "tender_deadline")
    : tab === "documents"
    ? notifications.filter(n => n.type.startsWith("document"))
    : notifications.filter(n => n.type === "stale_bid");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground">Alerts for deadlines, expiring documents, and stale bids.</p>
        </div>
        {data && (
          <div className="flex items-center gap-2">
            {counts.urgent > 0 && (
              <Badge className="bg-red-500 text-white gap-1">
                <AlertTriangle className="h-3 w-3" />
                {counts.urgent} Urgent
              </Badge>
            )}
            {counts.warning > 0 && (
              <Badge variant="outline" className="border-amber-400 text-amber-600 gap-1">
                <Clock className="h-3 w-3" />
                {counts.warning} Warning
              </Badge>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid gap-3 sm:grid-cols-4">
        <SummaryCard
          icon={AlertTriangle}
          label="Urgent"
          count={counts.urgent}
          color="text-red-500"
          bg="bg-red-50 dark:bg-red-950/40"
          border="border-red-200 dark:border-red-800"
          loading={isLoading}
        />
        <SummaryCard
          icon={Clock}
          label="Tenders Closing"
          count={notifications.filter(n => n.type === "tender_deadline").length}
          color="text-amber-500"
          bg="bg-amber-50 dark:bg-amber-950/40"
          border="border-amber-200 dark:border-amber-800"
          loading={isLoading}
        />
        <SummaryCard
          icon={FileWarning}
          label="Doc Issues"
          count={notifications.filter(n => n.type.startsWith("document")).length}
          color="text-orange-500"
          bg="bg-orange-50 dark:bg-orange-950/40"
          border="border-orange-200 dark:border-orange-800"
          loading={isLoading}
        />
        <SummaryCard
          icon={Target}
          label="Stale Bids"
          count={notifications.filter(n => n.type === "stale_bid").length}
          color="text-blue-500"
          bg="bg-blue-50 dark:bg-blue-950/40"
          border="border-blue-200 dark:border-blue-800"
          loading={isLoading}
        />
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all">
            All
            {notifications.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 text-xs h-4 px-1">{notifications.length}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="urgent">
            Urgent
            {counts.urgent > 0 && (
              <Badge className="ml-1.5 text-xs h-4 px-1 bg-red-500 text-white">{counts.urgent}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="tenders">Tenders</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="bids">Bids</TabsTrigger>
        </TabsList>

        <TabsContent value={tab} className="mt-4 space-y-3">
          {isLoading ? (
            [1, 2, 3, 4].map(i => <Skeleton key={i} className="h-20 w-full" />)
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <CheckCircle2 className="h-14 w-14 opacity-20 mb-3 text-emerald-500" />
              <p className="font-medium text-base">All clear!</p>
              <p className="text-sm opacity-70 mt-1">No alerts in this category.</p>
            </div>
          ) : (
            filtered.map(n => <NotificationCard key={n.id} n={n} />)
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SummaryCard({ icon: Icon, label, count, color, bg, border, loading }: any) {
  return (
    <div className={`rounded-xl border p-4 ${bg} ${border}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
      </div>
      {loading ? (
        <Skeleton className="h-7 w-8" />
      ) : (
        <p className={`text-2xl font-bold ${count > 0 ? color : "text-muted-foreground"}`}>{count}</p>
      )}
    </div>
  );
}
