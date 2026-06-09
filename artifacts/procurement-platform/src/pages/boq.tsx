import { useListBoq } from "@workspace/api-client-react";
import { formatCurrency } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Calculator, Package, TrendingDown, TrendingUp } from "lucide-react";

export default function BoqPage() {
  const { data: items, isLoading } = useListBoq();
  const list = items ?? [];

  const totalBudget = list.reduce((acc, item) => acc + Number(item.totalCost || Number(item.quantity) * Number(item.unitCost || 0)), 0);
  const totalActual = list.reduce((acc, item) => acc + Number(item.vendorQuote || item.totalCost || Number(item.quantity) * Number(item.unitCost || 0)), 0);
  const variance = totalBudget - totalActual;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-foreground">BOQ Price Intelligence</h1>
        <p className="text-muted-foreground">Bill of quantities analysis, market benchmarks, and pricing intelligence.</p>
      </div>

      {!isLoading && list.length > 0 && (
        <div className="grid gap-4 md:grid-cols-3">
          <Metric title="Total Budget" value={formatCurrency(totalBudget)} desc="Across all BOQ items" />
          <Metric title="Vendor Quote" value={formatCurrency(totalActual)} desc="Based on captured quotes" />
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">Variance</CardTitle>
            </CardHeader>
            <CardContent>
              <div className={`flex items-center gap-2 text-2xl font-bold ${variance >= 0 ? "text-green-600" : "text-red-600"}`}>
                {variance >= 0 ? <TrendingDown className="h-5 w-5" /> : <TrendingUp className="h-5 w-5" />}
                {formatCurrency(Math.abs(variance))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{variance >= 0 ? "Under budget" : "Over budget"}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4, 5].map((item) => <Skeleton key={item} className="h-16 w-full" />)}</div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Calculator className="h-5 w-5" /> BOQ Line Items</CardTitle>
            <CardDescription>Detailed breakdown of procurement items</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    <th className="pb-3 pr-4 text-left font-medium text-muted-foreground">Item</th>
                    <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">Qty</th>
                    <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">Unit Cost</th>
                    <th className="pb-3 pr-4 text-right font-medium text-muted-foreground">Budget</th>
                    <th className="pb-3 text-right font-medium text-muted-foreground">Vendor Quote</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.map((item) => {
                    const budget = Number(item.totalCost || Number(item.quantity) * Number(item.unitCost || 0));
                    const actual = Number(item.vendorQuote || budget);
                    const diff = budget ? ((actual - budget) / budget) * 100 : 0;
                    return (
                      <tr key={item.id} className="transition-colors hover:bg-muted/40">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-2">
                            <Package className="h-4 w-4 shrink-0 text-muted-foreground" />
                            <span className="font-medium">{item.description}</span>
                          </div>
                          <p className="ml-6 mt-0.5 text-xs text-muted-foreground">
                            Margin {item.margin ?? 0}% · GST {item.gst ?? 0}%
                          </p>
                        </td>
                        <td className="py-3 pr-4 text-right">{item.quantity} {item.unit}</td>
                        <td className="py-3 pr-4 text-right">{formatCurrency(Number(item.unitCost || 0))}</td>
                        <td className="py-3 pr-4 text-right font-medium">{formatCurrency(budget)}</td>
                        <td className="py-3 text-right">
                          <span>{formatCurrency(actual)}</span>
                          {diff !== 0 && (
                            <Badge variant={diff > 10 ? "destructive" : diff > 0 ? "outline" : "secondary"} className="ml-2 text-[10px]">
                              {diff > 0 ? "+" : ""}{diff.toFixed(1)}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {list.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-muted-foreground">No BOQ items found.</td>
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

function Metric({ title, value, desc }: { title: string; value: string; desc: string }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        <p className="mt-1 text-xs text-muted-foreground">{desc}</p>
      </CardContent>
    </Card>
  );
}
