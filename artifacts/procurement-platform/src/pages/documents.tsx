import { useListDocuments } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { FolderOpen, FileText, Search, Calendar, User, ExternalLink } from "lucide-react";

const CATEGORY_COLORS: Record<string, string> = {
  registration: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  technical: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  financial: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  legal: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
  bid: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  other: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
};

function getFileIcon(fileType: string) {
  return <FileText className="h-8 w-8 text-muted-foreground" />;
}

export default function Documents() {
  const { data: documents, isLoading } = useListDocuments();
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("all");

  const categories = ["all", ...Array.from(new Set((documents || []).map(d => d.category).filter(Boolean)))];

  const filtered = (documents || []).filter(doc => {
    const matchSearch = !search || doc.title?.toLowerCase().includes(search.toLowerCase()) ||
      doc.description?.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCat === "all" || doc.category === filterCat;
    return matchSearch && matchCat;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Document Vault</h1>
        <p className="text-muted-foreground">Centralized repository of all procurement and compliance documents.</p>
      </div>

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
          {categories.map(cat => (
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
          {filtered.map((doc) => (
            <Card key={doc.id} className="hover:shadow-md transition-shadow group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="bg-muted rounded-lg p-2 shrink-0">
                    {getFileIcon(doc.fileType)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-sm leading-snug line-clamp-2">{doc.title}</p>
                      {doc.fileUrl && (
                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <ExternalLink className="h-4 w-4 text-muted-foreground" />
                        </a>
                      )}
                    </div>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{doc.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-3">
                      {doc.category && (
                        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${CATEGORY_COLORS[doc.category] || CATEGORY_COLORS.other}`}>
                          {doc.category}
                        </span>
                      )}
                      {doc.expiryDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          Expires {formatDate(doc.expiryDate)}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {formatDate(doc.createdAt)}
                      {doc.fileSize && (
                        <span className="ml-auto">{(doc.fileSize / 1024).toFixed(0)} KB</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
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
