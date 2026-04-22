import { useListVendors } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Star, Package, Phone, Mail, MapPin } from "lucide-react";

const STATUS_VARIANTS: Record<string, any> = {
  active: "default",
  inactive: "secondary",
  blacklisted: "destructive",
  pending_approval: "outline",
};

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map(i => (
        <Star key={i} className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "text-muted-foreground"}`} />
      ))}
    </div>
  );
}

export default function Vendors() {
  const { data: vendors, isLoading } = useListVendors();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Vendors & OEMs</h1>
        <p className="text-muted-foreground">Manage your vendor/OEM/subcontractor relationships and qualifications.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3 mb-2">
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Total Vendors</p>
          <p className="text-2xl font-bold">{(vendors || []).length}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Active</p>
          <p className="text-2xl font-bold">{(vendors || []).filter(v => v.status === "active").length}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Categories</p>
          <p className="text-2xl font-bold">{new Set((vendors || []).map(v => v.category).filter(Boolean)).size}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2">
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-56 w-full" />)}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(vendors || []).map((vendor) => (
            <Card key={vendor.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">{vendor.name}</CardTitle>
                    {vendor.category && (
                      <CardDescription className="capitalize">{vendor.category.replace("_", " ")}</CardDescription>
                    )}
                  </div>
                  <Badge variant={STATUS_VARIANTS[vendor.status] || "secondary"} className="capitalize">
                    {vendor.status?.replace("_", " ")}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.rating !== undefined && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={Math.round(vendor.rating)} />
                    <span className="text-sm text-muted-foreground">({vendor.rating.toFixed(1)})</span>
                  </div>
                )}

                {vendor.contactEmail && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{vendor.contactEmail}</span>
                  </div>
                )}
                {vendor.contactPhone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {vendor.contactPhone}
                  </div>
                )}
                {vendor.city && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5 shrink-0" />
                    {[vendor.city, vendor.state].filter(Boolean).join(", ")}
                  </div>
                )}

                {vendor.specializations && vendor.specializations.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Specializations</p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.specializations.map((s: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{s}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.contractValue && (
                  <div className="flex items-center justify-between text-sm pt-2 border-t border-border">
                    <span className="text-muted-foreground">Contract Value</span>
                    <span className="font-medium">{formatCurrency(vendor.contractValue)}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          {(!vendors || vendors.length === 0) && (
            <div className="col-span-full text-center text-muted-foreground py-16">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              No vendors found.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
