import { useState, useMemo } from "react";
import { useListVendors, useListTenders } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Star, Zap, Package, Building2, TrendingUp, CheckCircle2, Mail, Phone } from "lucide-react";

// ─── Matching Algorithm ─────────────────────────────────────────────────────
function computeMatchScore(vendor: any, tender: any): number {
  let score = 0;

  // 1. Category match (50 pts)
  const tenderCat = (tender.category || "").toLowerCase();
  const vendorCats = (vendor.categories || []).map((c: string) => c.toLowerCase());
  const exactMatch = vendorCats.some((c: string) => c === tenderCat || tenderCat.includes(c) || c.includes(tenderCat));
  const partialMatch = vendorCats.some((c: string) => {
    const words = tenderCat.split(/[\s,]/);
    return words.some((w: string) => w.length > 3 && c.includes(w));
  });
  if (exactMatch) score += 50;
  else if (partialMatch) score += 25;

  // 2. OEM products (20 pts)
  if (vendor.type === "oem") score += 15;
  const oemProds = (vendor.oemProducts || []).map((p: string) => p.toLowerCase());
  if (oemProds.some((p: string) => tenderCat.includes(p) || p.includes(tenderCat))) score += 5;

  // 3. Rating (20 pts max)
  if (vendor.rating) {
    score += Math.round((Number(vendor.rating) / 5) * 20);
  }

  // 4. Has contact info (10 pts)
  if (vendor.email || vendor.phone) score += 5;
  if (vendor.contactName) score += 5;

  return Math.min(100, score);
}

function getMatchLevel(score: number): { label: string; variant: "default" | "secondary" | "outline" | "destructive"; color: string } {
  if (score >= 70) return { label: "Strong Match", variant: "default", color: "text-emerald-600" };
  if (score >= 45) return { label: "Good Match", variant: "secondary", color: "text-blue-600" };
  if (score >= 20) return { label: "Partial Match", variant: "outline", color: "text-amber-600" };
  return { label: "Low Match", variant: "outline", color: "text-gray-400" };
}

export default function Suppliers() {
  const { data: vendors, isLoading: vendorsLoading } = useListVendors();
  const { data: tendersResp, isLoading: tendersLoading } = useListTenders({ status: "open" });
  const [tenderSearch, setTenderSearch] = useState("");
  const [vendorSearch, setVendorSearch] = useState("");
  const [selectedTender, setSelectedTender] = useState<any>(null);

  const tenders = tendersResp?.data || [];

  const filteredTenders = tenders.filter(t =>
    tenderSearch === "" ||
    t.title.toLowerCase().includes(tenderSearch.toLowerCase()) ||
    t.category.toLowerCase().includes(tenderSearch.toLowerCase())
  );

  const filteredVendors = (vendors || []).filter(v =>
    vendorSearch === "" ||
    v.companyName.toLowerCase().includes(vendorSearch.toLowerCase()) ||
    (v.categories || []).some((c: string) => c.toLowerCase().includes(vendorSearch.toLowerCase()))
  );

  // Compute matches for selected tender
  const matches = useMemo(() => {
    if (!selectedTender || !vendors) return [];
    return (vendors || [])
      .map(v => ({ vendor: v, score: computeMatchScore(v, selectedTender) }))
      .sort((a, b) => b.score - a.score);
  }, [selectedTender, vendors]);

  // Top supplier per category
  const categorySuppliers = useMemo(() => {
    const map: Record<string, any[]> = {};
    (vendors || []).forEach(v => {
      (v.categories || []).forEach((cat: string) => {
        if (!map[cat]) map[cat] = [];
        map[cat].push(v);
      });
    });
    return Object.entries(map).map(([cat, vends]) => ({
      category: cat,
      vendors: vends.sort((a, b) => Number(b.rating || 0) - Number(a.rating || 0)),
    }));
  }, [vendors]);

  const isLoading = vendorsLoading || tendersLoading;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Supplier Intelligence</h1>
          <p className="text-muted-foreground">Discover and match suppliers to your procurement needs.</p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Total Suppliers</p>
          <p className="text-2xl font-bold">{(vendors || []).length}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">OEM Partners</p>
          <p className="text-2xl font-bold">{(vendors || []).filter(v => v.type === "oem").length}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Categories Covered</p>
          <p className="text-2xl font-bold">
            {new Set((vendors || []).flatMap(v => v.categories || [])).size}
          </p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Open Tenders to Match</p>
          <p className="text-2xl font-bold">{tenders.length}</p>
        </div>
      </div>

      <Tabs defaultValue="matching">
        <TabsList>
          <TabsTrigger value="matching">Smart Matching</TabsTrigger>
          <TabsTrigger value="directory">Supplier Directory</TabsTrigger>
          <TabsTrigger value="categories">By Category</TabsTrigger>
        </TabsList>

        {/* Matching Tab */}
        <TabsContent value="matching" className="space-y-4 mt-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Tender Selection */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1">1. Select a Tender</h3>
                <p className="text-sm text-muted-foreground mb-3">Choose an open tender to find the best-matched suppliers.</p>
                <div className="relative">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search tenders..." className="pl-8" value={tenderSearch} onChange={e => setTenderSearch(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                {tendersLoading ? (
                  [1,2,3].map(i => <Skeleton key={i} className="h-20 w-full" />)
                ) : filteredTenders.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No open tenders found.</p>
                ) : (
                  filteredTenders.map(t => (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTender(t)}
                      className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                        selectedTender?.id === t.id
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/40 hover:bg-muted/50"
                      }`}
                    >
                      <p className="text-sm font-medium line-clamp-1">{t.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">{t.category}</Badge>
                        {t.estimatedValue && (
                          <span className="text-xs text-muted-foreground">{formatCurrency(Number(t.estimatedValue))}</span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">{t.authority}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Matched Suppliers */}
            <div className="space-y-3">
              <div>
                <h3 className="font-semibold mb-1">2. Matched Suppliers</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {selectedTender
                    ? `Ranked suppliers for: ${selectedTender.title}`
                    : "Select a tender to see matched suppliers."}
                </p>
              </div>

              {!selectedTender ? (
                <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
                  <Zap className="h-12 w-12 opacity-20 mb-3" />
                  <p className="text-sm">Select a tender on the left to run the matching algorithm</p>
                </div>
              ) : vendorsLoading ? (
                [1,2,3].map(i => <Skeleton key={i} className="h-24 w-full" />)
              ) : matches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No suppliers in network yet.</p>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {matches.map(({ vendor, score }) => {
                    const ml = getMatchLevel(score);
                    return (
                      <div key={vendor.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{vendor.companyName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{vendor.type}</p>
                          </div>
                          <Badge variant={ml.variant} className="shrink-0 text-xs">{ml.label}</Badge>
                        </div>
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Match Score</span>
                            <span className={`font-semibold ${ml.color}`}>{score}%</span>
                          </div>
                          <Progress value={score} className="h-1.5" />
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(vendor.categories || []).map((c: string, i: number) => (
                            <Badge key={i} variant="secondary" className="text-[10px] px-1 py-0">{c}</Badge>
                          ))}
                        </div>
                        <div className="flex gap-2 pt-1">
                          {vendor.email && (
                            <a href={`mailto:${vendor.email}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                              <Mail className="h-3 w-3" />{vendor.email}
                            </a>
                          )}
                          {vendor.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />{vendor.phone}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Directory Tab */}
        <TabsContent value="directory" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Supplier Directory</CardTitle>
                  <CardDescription>{(vendors || []).length} suppliers in your network</CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search suppliers..." className="pl-8" value={vendorSearch} onChange={e => setVendorSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {vendorsLoading ? (
                <div className="space-y-2">{[1,2,3,4].map(i => <Skeleton key={i} className="h-14 w-full" />)}</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Supplier</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Categories</TableHead>
                      <TableHead>OEM Products</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Contact</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map(v => (
                      <TableRow key={v.id}>
                        <TableCell>
                          <p className="font-medium text-sm">{v.companyName}</p>
                          {v.contactName && <p className="text-xs text-muted-foreground">{v.contactName}</p>}
                        </TableCell>
                        <TableCell>
                          <Badge variant={v.type === "oem" ? "default" : "outline"} className="capitalize text-xs">{v.type}</Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(v.categories || []).map((c: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{c}</Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(v.oemProducts || []).slice(0, 2).map((p: string, i: number) => (
                              <Badge key={i} variant="outline" className="text-xs">{p}</Badge>
                            ))}
                            {(v.oemProducts || []).length > 2 && (
                              <Badge variant="outline" className="text-xs">+{(v.oemProducts || []).length - 2}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                            <span className="text-sm font-medium">{v.rating ? Number(v.rating).toFixed(1) : "—"}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-0.5">
                            {v.email && <div className="text-primary truncate max-w-36">{v.email}</div>}
                            {v.phone && <div className="text-muted-foreground">{v.phone}</div>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* By Category Tab */}
        <TabsContent value="categories" className="mt-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              [1,2,3,4,5,6].map(i => <Skeleton key={i} className="h-48 w-full" />)
            ) : categorySuppliers.map(({ category, vendors: cvs }) => (
              <Card key={category}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{category}</CardTitle>
                    <Badge variant="secondary">{cvs.length} supplier{cvs.length !== 1 ? "s" : ""}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {cvs.slice(0, 3).map(v => (
                    <div key={v.id} className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{v.companyName}</p>
                        <Badge variant="outline" className="text-[10px] capitalize mt-0.5">{v.type}</Badge>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span className="text-xs">{v.rating ? Number(v.rating).toFixed(1) : "—"}</span>
                      </div>
                    </div>
                  ))}
                  {cvs.length > 3 && (
                    <p className="text-xs text-muted-foreground">+{cvs.length - 3} more</p>
                  )}
                </CardContent>
              </Card>
            ))}
            {categorySuppliers.length === 0 && !isLoading && (
              <div className="col-span-full text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-3 opacity-30" />
                No category data available.
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
