import { useListDocuments } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import {
  FolderOpen, FileText, Search, Calendar, AlertTriangle, Clock, ExternalLink, ShieldAlert
} from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  registration: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  technical: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  financial: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  certification: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
  tax: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  legal: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  bid: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function getExpiryInfo(expiryDate: string | null | undefined) {
  if (!expiryDate) return null;
  const now = new Date();
  const expiry = new Date(expiryDate);
  const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return { status: "expired", daysLeft, label: `Expired ${Math.abs(daysLeft)}d ago`, color: "text-red-600 dark:text-red-400" };
  if (daysLeft <= 7) return { status: "urgent", daysLeft, label: `Expires in ${daysLeft}d`, color: "text-red-600 dark:text-red-400" };
  if (daysLeft <= 30) return { status: "soon", daysLeft, label: `Expires in ${daysLeft}d`, color: "text-amber-600 dark:text-amber-400" };
  return { status: "ok", daysLeft, label: `Expires ${formatDate(expiryDate)}`, color: "text-muted-foreground" };
}

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const docs: any[] = (documents as any[]) || [];
  const categories = ["all", ...Array.from(new Set(docs.map(d => d.category).filter(Boolean)))];

  const expiredCount = docs.filter(d => getExpiryInfo(d.expiryDate)?.status === "expired").length;
  const urgentCount = docs.filter(d => {
    const info = getExpiryInfo(d.expiryDate);
    return info?.status === "urgent" || info?.status === "soon";
  }).length;

  const filtered = docs.filter(doc => {
    const matchSearch = !search ||
      doc.name?.toLowerCase().includes(search.toLowerCase()) ||
      doc.category?.toLowerCase().includes(search.toLowerCase()) ||
      doc.fileName?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || doc.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Document Vault</h1>
        <p className="text-muted-foreground">Centralized repository of all procurement and compliance documents.</p>
      </div>

      {!isLoading && (expiredCount > 0 || urgentCount > 0) && (
        <div className="space-y-2">
          {expiredCount > 0 && (
            <div className="flex items-center gap-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg px-4 py-3">
              <ShieldAlert className="h-5 w-5 text-red-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">
                  {expiredCount} document{expiredCount > 1 ? "s have" : " has"} expired
                </p>
                <p className="text-xs text-red-600/80 dark:text-red-400/70">Renew these documents immediately to maintain compliance.</p>
              </div>
            </div>
          )}
          {urgentCount > 0 && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg px-4 py-3">
              <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-amber-700 dark:text-amber-400">
                  {urgentCount} document{urgentCount > 1 ? "s are" : " is"} expiring within 30 days
                </p>
                <p className="text-xs text-amber-600/80 dark:text-amber-400/70">Schedule renewal to avoid compliance gaps.</p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {(categories as string[]).map(cat => (
            <button
              key={cat}
              onClick={() => setFilterCat(cat)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterCat === cat
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((doc: any) => {
            const expiryInfo = getExpiryInfo(doc.expiryDate);
            const isProblematic = expiryInfo && (expiryInfo.status === "expired" || expiryInfo.status === "urgent");

            return (
              <Card
                key={doc.id}
                className={`hover:shadow-md transition-shadow group ${
                  isProblematic ? "ring-1 ring-red-300 dark:ring-red-700" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 ${
                      isProblematic ? "bg-red-50 dark:bg-red-950/30" : "bg-muted"
                    }`}>
                      <FileText className={`h-8 w-8 ${
                        isProblematic ? "text-red-400" : "text-muted-foreground"
                      }`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-medium text-sm leading-snug line-clamp-2">{doc.name}</p>
                        {doc.fileUrl && (
                          <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                            className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                            <ExternalLink className="h-4 w-4 text-muted-foreground" />
                          </a>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{doc.fileName}</p>
                      <div className="flex items-center gap-2 mt-3 flex-wrap">
                        {doc.category && (
                          <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                            CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other
                          }`}>
                            {doc.category}
                          </span>
                        )}
                        {expiryInfo && (
                          <div className={`flex items-center gap-1 text-xs font-medium ${expiryInfo.color}`}>
                            {expiryInfo.status === "expired" ? (
                              <ShieldAlert className="h-3 w-3" />
                            ) : expiryInfo.status === "urgent" || expiryInfo.status === "soon" ? (
                              <AlertTriangle className="h-3 w-3" />
                            ) : (
                              <Clock className="h-3 w-3" />
                            )}
                            {expiryInfo.label}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                        <Calendar className="h-3 w-3" />
                        Uploaded {formatDate(doc.createdAt)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-16">
              <FolderOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No documents found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
