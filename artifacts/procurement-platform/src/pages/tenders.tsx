import { useState } from "react";
import { useListTenders, getListTendersQueryKey } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Link } from "wouter";
import { Search, Filter, ArrowUpDown, ExternalLink, Building2, MapPin } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Tenders() {
  const [search, setSearch] = useState("");
  const [source, setSource] = useState<string>("all");
  const [status, setStatus] = useState<string>("open");

  const queryParams: any = {};
  if (search) queryParams.q = search;
  if (source !== "all") queryParams.source = source;
  if (status !== "all") queryParams.status = status;

  const { data: response, isLoading } = useListTenders(queryParams, {
    query: {
      queryKey: getListTendersQueryKey(queryParams)
    }
  });

  const getRiskColor = (score: string | undefined) => {
    if (score === 'green') return 'bg-emerald-500/10 text-emerald-600 border-emerald-200';
    if (score === 'yellow') return 'bg-amber-500/10 text-amber-600 border-amber-200';
    if (score === 'red') return 'bg-red-500/10 text-red-600 border-red-200';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Tender Discovery</h1>
          <p className="text-muted-foreground">Search and track government and private tenders.</p>
        </div>
        <Button>
          <Search className="mr-2 h-4 w-4" />
          Advanced Search
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search by title, ref number, authority..."
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={source} onValueChange={setSource}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Source" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sources</SelectItem>
              <SelectItem value="gem">GeM Portal</SelectItem>
              <SelectItem value="cppp">CPPP</SelectItem>
              <SelectItem value="state">State Portals</SelectItem>
              <SelectItem value="railway">Railways</SelectItem>
              <SelectItem value="defence">Defence</SelectItem>
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="awarded">Awarded</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon">
            <Filter className="h-4 w-4" />
          </Button>
        </CardContent>
      </Card>

      {/* Tenders Table */}
      <Card>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40%]">Tender Details</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Deadlines</TableHead>
                <TableHead>Risk</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell><Skeleton className="h-12 w-full" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-6 w-16" /></TableCell>
                    <TableCell><Skeleton className="h-8 w-8 ml-auto" /></TableCell>
                  </TableRow>
                ))
              ) : response?.data?.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-muted-foreground">
                    No tenders found matching your criteria.
                  </TableCell>
                </TableRow>
              ) : (
                response?.data?.map((tender) => (
                  <TableRow key={tender.id} className="group hover:bg-muted/50 transition-colors">
                    <TableCell>
                      <div className="space-y-2">
                        <Link href={`/tenders/${tender.id}`} className="font-semibold text-primary hover:underline line-clamp-2">
                          {tender.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                          <span className="flex items-center"><Building2 className="mr-1 h-3 w-3" /> {tender.authority}</span>
                          {tender.state && <span className="flex items-center"><MapPin className="mr-1 h-3 w-3" /> {tender.state}</span>}
                          <span className="bg-secondary/20 text-secondary-foreground px-1.5 py-0.5 rounded uppercase tracking-wider">{tender.source}</span>
                          <span>Ref: {tender.referenceNumber || 'N/A'}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{tender.estimatedValue ? formatCurrency(tender.estimatedValue) : 'Not Disclosed'}</div>
                      <div className="text-xs text-muted-foreground mt-1">EMD: {tender.emdAmount ? formatCurrency(tender.emdAmount) : 'Nil'}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        <span className="text-muted-foreground">Closes:</span> <span className="font-medium text-red-600 dark:text-red-400">{formatDate(tender.closingDate)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Opens: {formatDate(tender.openingDate)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getRiskColor(tender.riskScore)}>
                        {tender.riskScore ? tender.riskScore.toUpperCase() : 'UNRATED'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" asChild>
                        <Link href={`/tenders/${tender.id}`}>
                          View Details
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        {!isLoading && response?.total && (
          <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
            <div>Showing {response.data.length} of {response.total} results</div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={response.page === 1}>Previous</Button>
              <Button variant="outline" size="sm" disabled={response.page * response.limit >= response.total}>Next</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
