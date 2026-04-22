import { useState } from "react";
import { useListKnowledgeItems } from "@workspace/api-client-react";
import { formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen, Search, FileText, Lightbulb, Scale, Package, Settings } from "lucide-react";

const TYPE_ICONS: Record<string, any> = {
  regulation: Scale,
  template: FileText,
  best_practice: Lightbulb,
  product_spec: Package,
  process: Settings,
};

const TYPE_COLORS: Record<string, string> = {
  regulation: "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300",
  template: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
  best_practice: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
  product_spec: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
  process: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
};

export default function Knowledge() {
  const { data: items, isLoading } = useListKnowledgeItems();
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");

  const types = ["all", ...Array.from(new Set((items || []).map(i => i.type).filter(Boolean)))];

  const filtered = (items || []).filter(item => {
    const matchSearch = !search ||
      item.title?.toLowerCase().includes(search.toLowerCase()) ||
      item.content?.toLowerCase().includes(search.toLowerCase());
    const matchType = filterType === "all" || item.type === filterType;
    return matchSearch && matchType;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Knowledge Base</h1>
        <p className="text-muted-foreground">Institutional knowledge, templates, regulations, and best practices.</p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search knowledge base..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto">
          {types.map(type => (
            <button
              key={type}
              onClick={() => setFilterType(type)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                filterType === type
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {type === "all" ? "All" : type.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase())}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3].map(i => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((item) => {
            const Icon = TYPE_ICONS[item.type] || FileText;
            return (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-5">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-lg p-2 shrink-0 ${TYPE_COLORS[item.type] || "bg-muted"}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
                        <Badge variant="outline" className="text-[10px] shrink-0 capitalize">
                          {item.type?.replace("_", " ")}
                        </Badge>
                      </div>
                      {item.content && (
                        <p className="text-sm text-muted-foreground mt-1.5 line-clamp-3">{item.content}</p>
                      )}
                      <div className="flex items-center gap-3 mt-3">
                        {item.tags && item.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {item.tags.map((tag: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-[10px] font-normal">{tag}</Badge>
                            ))}
                          </div>
                        )}
                        <span className="text-xs text-muted-foreground ml-auto shrink-0">{formatDate(item.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {filtered.length === 0 && (
            <div className="col-span-full text-center text-muted-foreground py-16">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No knowledge items found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
