import { Router } from "express";
import { db } from "@workspace/db";
import { tenderAnalysisTable, tendersTable, companyProfileTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authenticate);

function generateMockAnalysis(tender: any, tenantId: number) {
  const riskScore = ["green", "yellow", "red"][Math.floor(Math.random() * 3)];
  const eligibilityScore = 55 + Math.floor(Math.random() * 45);
  return {
    tenantId,
    tenderId: tender.id,
    eligibilityScore: eligibilityScore.toString(),
    riskScore,
    eligibilityCriteria: JSON.stringify([
      { criterion: "Annual Turnover ≥ ₹50L", met: eligibilityScore > 70, notes: "Verified from past 3 years" },
      { criterion: "GST Registration", met: true, notes: "Active GST" },
      { criterion: "Experience in similar work", met: eligibilityScore > 60, notes: "Minimum 3 years required" },
    ]),
    keyDeadlines: JSON.stringify([
      { label: "Pre-Bid Meeting", date: tender.preBidDate || new Date(Date.now() + 5 * 86400000).toISOString().split("T")[0] },
      { label: "Bid Submission", date: tender.closingDate || new Date(Date.now() + 15 * 86400000).toISOString().split("T")[0] },
    ]),
    riskFactors: JSON.stringify([
      { factor: "Short submission timeline", severity: "high" },
      { factor: "High EMD requirement", severity: "medium" },
      { factor: "OEM authorization needed", severity: eligibilityScore < 65 ? "high" : "low" },
    ]),
    hiddenClauses: JSON.stringify(["Price variation clause limited to 5%", "Liquidated damages at 0.5% per week", "Performance guarantee 10% of contract value"]),
    turnoverRequired: "5000000",
    certifications: JSON.stringify(["ISO 9001:2015", "MSME registration"]),
    emdAmount: tender.emdAmount || "100000",
    paymentTerms: "30 days after delivery and acceptance",
    aiSummary: `This ${tender.category} tender from ${tender.authority} requires suppliers with proven experience. Risk level is ${riskScore}. Eligibility score: ${eligibilityScore}%. Key consideration: ensure timely document submission and verify OEM authorizations.`,
  };
}

router.get("/:tenderId", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const tenderId = Number(req.params.tenderId);
  const [analysis] = await db.select().from(tenderAnalysisTable).where(and(eq(tenderAnalysisTable.tenderId, tenderId), eq(tenderAnalysisTable.tenantId, tenantId))).limit(1);
  if (!analysis) { res.status(404).json({ error: "Analysis not found. Run analysis first." }); return; }

  const parsed = {
    ...analysis,
    eligibilityCriteria: analysis.eligibilityCriteria ? JSON.parse(analysis.eligibilityCriteria as string) : [],
    keyDeadlines: analysis.keyDeadlines ? JSON.parse(analysis.keyDeadlines as string) : [],
    riskFactors: analysis.riskFactors ? JSON.parse(analysis.riskFactors as string) : [],
    hiddenClauses: analysis.hiddenClauses ? JSON.parse(analysis.hiddenClauses as string) : [],
    certifications: analysis.certifications ? JSON.parse(analysis.certifications as string) : [],
  };
  res.json(parsed);
});

router.post("/:tenderId", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const tenderId = Number(req.params.tenderId);

  const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, tenderId), eq(tendersTable.tenantId, tenantId))).limit(1);
  if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }

  await db.delete(tenderAnalysisTable).where(and(eq(tenderAnalysisTable.tenderId, tenderId), eq(tenderAnalysisTable.tenantId, tenantId)));

  const analysisData = generateMockAnalysis(tender, tenantId);
  const [analysis] = await db.insert(tenderAnalysisTable).values(analysisData).returning();

  await db.update(tendersTable).set({ riskScore: analysisData.riskScore, aiSummary: analysisData.aiSummary, updatedAt: new Date() }).where(eq(tendersTable.id, tenderId));

  await db.insert(activityLogsTable).values({
    tenantId, type: "analysis_completed", entityType: "tender", entityId: tenderId, entityName: tender.title,
    description: `AI analysis completed for ${tender.title}. Risk: ${analysisData.riskScore}`,
  });

  const parsed = {
    ...analysis,
    eligibilityCriteria: JSON.parse(analysisData.eligibilityCriteria),
    keyDeadlines: JSON.parse(analysisData.keyDeadlines),
    riskFactors: JSON.parse(analysisData.riskFactors),
    hiddenClauses: JSON.parse(analysisData.hiddenClauses),
    certifications: JSON.parse(analysisData.certifications),
  };
  res.json(parsed);
});

router.get("/:tenderId/go-no-go", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const tenderId = Number(req.params.tenderId);

  const [analysis] = await db.select().from(tenderAnalysisTable).where(and(eq(tenderAnalysisTable.tenderId, tenderId), eq(tenderAnalysisTable.tenantId, tenantId))).limit(1);
  const [profile] = await db.select().from(companyProfileTable).where(eq(companyProfileTable.tenantId, tenantId)).limit(1);

  const eligibilityScore = analysis ? parseFloat(analysis.eligibilityScore || "60") : 60;
  const strategicFit = 60 + Math.floor(Math.random() * 35);
  const marginPotential = 50 + Math.floor(Math.random() * 40);
  const score = (eligibilityScore * 0.4 + strategicFit * 0.3 + marginPotential * 0.3);

  let decision: "bid" | "skip" | "review" = "review";
  if (score >= 70) decision = "bid";
  else if (score < 45) decision = "skip";

  res.json({
    tenderId,
    decision,
    score: Math.round(score),
    strategicFit,
    eligibilityScore,
    marginPotential,
    competitionLevel: score > 65 ? "low" : score > 50 ? "medium" : "high",
    reasoning: `Based on eligibility score (${eligibilityScore}%), strategic fit (${strategicFit}%), and margin potential (${marginPotential}%), the overall bid score is ${Math.round(score)}%.`,
    recommendation: decision === "bid"
      ? "Strong fit. Proceed with bid preparation immediately. Prioritize document collection and BOQ pricing."
      : decision === "skip"
      ? "This tender has significant eligibility gaps or low margin potential. Consider skipping to focus resources on better opportunities."
      : "Borderline opportunity. Review eligibility gaps and competition before deciding. Consult with the technical team.",
  });
});

export default router;
