import { useListBoq } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, Package, TrendingUp, TrendingDown } from "lucide-react";

export default function BoqPage() {
  const { data: items, isLoading } = useListBoq();

  const totalBudget = (items || []).reduce((acc, item) => acc + (item.totalBudget || 0), 0);
  const totalActual = (items || []).reduce((acc, item) => acc + (item.totalActual || 0), 0);
  const variance = totalBudget - totalActual;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">BOQ Price Intelligence</h1>
        <p className="text-muted-foreground">Bill of Quantities analysis, market benchmarks, and pricing intelligence.</p>
      </div>

      {!isLoading && items && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Total Budget</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalBudget)}</div>
              <p className="text-xs text-muted-foreground mt-1">Across all BOQ items</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Actual Quoted</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(totalActual)}</div>
              <p className="text-xs text-muted-foreground mt-1">Based on market rates</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold flex items-center gap-2 ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {variance >= 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                {formatCurrency(Math.abs(variance))}
              </div>
              <p className="text-xs text-muted-foreground mt-1">{variance >= 0 ? "Under budget" : "Over budget"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16 w-full" />)}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>BOQ Line Items</CardTitle>
            <CardDescription>Detailed breakdown of all procurement items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Item</th>
                    <th className="text-left font-medium text-muted-foreground pb-3 pr-4">Category</th>
                    <th className="text-right font-medium text-muted-foreground pb-3 pr-4">Qty</th>
                    <th className="text-right font-medium text-muted-foreground pb-3 pr-4">Unit Rate</th>
                    <th className="text-right font-medium text-muted-foreground pb-3 pr-4">Budget</th>
                    <th className="text-right font-medium text-muted-foreground pb-3">Market Rate</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {(items || []).map((item) => {
                    const diff = item.totalBudget && item.totalActual ? ((item.totalActual - item.totalBudget) / item.totalBudget * 100) : 0;
                    return (
                      <tr key={item.id} className="hover:bg-muted/40 transition-colors">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 text-muted-foreground shrink-0" />
                            <span className="font-medium">{item.itemName}</span>
                          </div>
                          {item.specification && (
                            <p className="text-xs text-muted-foreground mt-0.5 ml-6">{item.specification}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4">
                          <Badge variant="secondary" className="text-xs capitalize">{item.category}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="py-3 pr-4 text-right">
                          {item.unitRate ? formatCurrency(item.unitRate) : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right font-medium">
                          {item.totalBudget ? formatCurrency(item.totalBudget) : "—"}
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <span>{item.totalActual ? formatCurrency(item.totalActual) : "—"}</span>
                            {diff !== 0 && (
                              <Badge variant={diff > 10 ? "destructive" : diff > 0 ? "outline" : "secondary"} className="text-[10px] px-1 py-0">
                                {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {(!items || items.length === 0) && (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-muted-foreground">No BOQ items found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
