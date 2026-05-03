import { useListVendors } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Star, Package, Phone, Mail } from "lucide-react";

const TYPE_VARIANTS: Record<string, any> = {
  oem: "default",
  vendor: "secondary",
  subcontractor: "outline",
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
          <p className="text-xs text-muted-foreground font-medium mb-1">OEM Partners</p>
          <p className="text-2xl font-bold">{(vendors || []).filter(v => v.type === "oem").length}</p>
        </div>
        <div className="bg-muted rounded-xl p-4">
          <p className="text-xs text-muted-foreground font-medium mb-1">Subcontractors</p>
          <p className="text-2xl font-bold">{(vendors || []).filter(v => v.type === "subcontractor").length}</p>
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
                    <CardTitle className="text-base">{vendor.companyName}</CardTitle>
                    {vendor.contactName && (
                      <CardDescription>{vendor.contactName}</CardDescription>
                    )}
                  </div>
                  <Badge variant={TYPE_VARIANTS[vendor.type] || "secondary"} className="capitalize">
                    {vendor.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {vendor.rating !== undefined && (
                  <div className="flex items-center gap-2">
                    <StarRating rating={Math.round(Number(vendor.rating))} />
                    <span className="text-sm text-muted-foreground">({Number(vendor.rating).toFixed(1)})</span>
                  </div>
                )}

                {vendor.email && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Mail className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{vendor.email}</span>
                  </div>
                )}
                {vendor.phone && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="h-3.5 w-3.5 shrink-0" />
                    {vendor.phone}
                  </div>
                )}

                {vendor.categories && vendor.categories.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5">Categories</p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.categories.map((c: string, i: number) => (
                        <Badge key={i} variant="secondary" className="text-xs font-normal">{c}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.oemProducts && vendor.oemProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                      <Package className="h-3 w-3" /> OEM Products
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {vendor.oemProducts.map((p: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs font-normal">{p}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {vendor.notes && (
                  <p className="text-sm text-muted-foreground line-clamp-2 border-t pt-2">{vendor.notes}</p>
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
