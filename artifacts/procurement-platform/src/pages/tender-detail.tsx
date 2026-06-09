import { useParams, useLocation } from "wouter";
import { useGetTender } from "@workspace/api-client-react";
import { formatCurrency, formatDate } from "@/lib/format";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { BookmarkCheck, Bookmark, ExternalLink, ArrowLeft, MapPin, Building2, Calendar, DollarSign } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

async function trackTender(id: number) {
  const token = localStorage.getItem("token") ?? "";
  const res = await fetch(`/api/tenders/${id}/track`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to track");
  return res.json();
}

async function untrackTender(id: number) {
  const token = localStorage.getItem("token") ?? "";
  const res = await fetch(`/api/tenders/${id}/untrack`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
  });
  if (!res.ok) throw new Error("Failed to untrack");
  return res.json();
}

export default function TenderDetail() {
  const [, navigate] = useLocation();
  const { id } = useParams();
  const { toast } = useToast();
  const [isTracked, setIsTracked] = useState(false);
  const [isTracking, setIsTracking] = useState(false);

  const tenderId = id ? Number(id) : undefined;
  const { data: tender, isLoading, isError } = useGetTender(tenderId || 0, {
    query: {
      enabled: !!tenderId,
      queryKey: ["tender", tenderId],
    },
  });

  if (!tenderId) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/tenders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tenders
        </Button>
        <div className="text-center text-muted-foreground">Invalid tender ID</div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" disabled>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tenders
        </Button>
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-full mb-4" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isError || !tender) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => navigate("/tenders")}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tenders
        </Button>
        <Card className="border-red-200 bg-red-50 dark:bg-red-950 dark:border-red-900">
          <CardContent className="pt-6 text-red-600 dark:text-red-400">
            Failed to load tender details. The tender may not exist or you don't have access to it.
          </CardContent>
        </Card>
      </div>
    );
  }

  const tenderDetails = tender as any;

  const handleTrack = async () => {
    setIsTracking(true);
    try {
      if (isTracked) {
        await untrackTender(tender.id);
        setIsTracked(false);
        toast({ title: "Tender removed", description: "Removed from your watchlist." });
      } else {
        await trackTender(tender.id);
        setIsTracked(true);
        toast({ title: "Tender tracked", description: "Added to your watchlist." });
      }
    } catch {
      toast({ title: "Failed to update watchlist", variant: "destructive" });
    } finally {
      setIsTracking(false);
    }
  };

  const getRiskColor = (score: string | undefined) => {
    if (score === "green") return "bg-emerald-500/10 text-emerald-600 border-emerald-200 dark:border-emerald-800";
    if (score === "yellow") return "bg-amber-500/10 text-amber-600 border-amber-200 dark:border-amber-800";
    if (score === "red") return "bg-red-500/10 text-red-600 border-red-200 dark:border-red-800";
    return "bg-gray-100 text-gray-600 border-gray-200";
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="ghost" onClick={() => navigate("/tenders")} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Tenders
        </Button>
        <Button
          variant={isTracked ? "default" : "outline"}
          onClick={handleTrack}
          disabled={isTracking}
          className="gap-2"
        >
          {isTracked ? (
            <>
              <BookmarkCheck className="h-4 w-4" />
              Tracked
            </>
          ) : (
            <>
              <Bookmark className="h-4 w-4" />
              Track Tender
            </>
          )}
        </Button>
      </div>

      {/* Title and Overview */}
      <Card>
        <CardHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">{tender.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="secondary">{tender.source?.toUpperCase()}</Badge>
                <Badge variant="outline" className={getRiskColor(tender.riskScore)}>
                  {tender.riskScore ? tender.riskScore.toUpperCase() : 'UNRATED'} RISK
                </Badge>
                <Badge variant={tender.status === 'open' ? 'default' : 'secondary'}>
                  {tender.status?.toUpperCase()}
                </Badge>
              </div>
            </div>
            {tender.description && (
              <p className="text-base text-muted-foreground leading-relaxed">{tender.description}</p>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Key Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tender Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.referenceNumber && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Reference Number</p>
                <p className="text-base font-semibold">{tender.referenceNumber}</p>
              </div>
            )}
            <div className="space-y-1">
              <p className="text-sm font-medium text-muted-foreground">Authority</p>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                <p className="text-base font-semibold">{tender.authority}</p>
              </div>
            </div>
            {tender.state && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Location</p>
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base font-semibold">{tender.state}</p>
                </div>
              </div>
            )}
            {tender.category && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Category</p>
                <p className="text-base font-semibold">{tender.category}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Right Column */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Financials & Deadlines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {tender.estimatedValue && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Estimated Value</p>
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                  <p className="text-lg font-bold text-green-600">{formatCurrency(tender.estimatedValue)}</p>
                </div>
              </div>
            )}
            {tender.emdAmount && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">EMD (Earnest Money Deposit)</p>
                <p className="text-base font-semibold">{formatCurrency(tender.emdAmount)}</p>
              </div>
            )}
            {tender.openingDate && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Opening Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <p className="text-base font-semibold">{formatDate(tender.openingDate)}</p>
                </div>
              </div>
            )}
            {tender.closingDate && (
              <div className="space-y-1">
                <p className="text-sm font-medium text-muted-foreground">Closing Date</p>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground text-red-500" />
                  <p className="text-base font-semibold text-red-600">{formatDate(tender.closingDate)}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Sections */}
      {tender.eligibilityCriteria && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Eligibility Criteria</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{tender.eligibilityCriteria}</p>
          </CardContent>
        </Card>
      )}

            {tenderDetails.technicalSpecs && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Technical Specifications</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{tenderDetails.technicalSpecs}</p>
          </CardContent>
        </Card>
      )}

      {tenderDetails.paymentTerms && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Payment Terms</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{tenderDetails.paymentTerms}</p>
          </CardContent>
        </Card>
      )}

      {tenderDetails.penalties && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Penalties & Liquidated Damages</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{tenderDetails.penalties}</p>
          </CardContent>
        </Card>
      )}

      {/* AI Summary */}
      {tender.aiSummary && (
        <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              🤖 AI Analysis Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{tender.aiSummary}</p>
          </CardContent>
        </Card>
      )}

      {/* External Links */}
      {tenderDetails.portalUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Portal Links</CardTitle>
          </CardHeader>
          <CardContent>
            <a
              href={tenderDetails.portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
            >
              View on Official Portal
              <ExternalLink className="h-4 w-4" />
            </a>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
