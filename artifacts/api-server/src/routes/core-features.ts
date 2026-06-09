import { Router } from "express";
import { and, desc, eq, gte, ilike, lte, or } from "drizzle-orm";
import {
  activityLogsTable,
  bidsTable,
  companyProfileTable,
  documentsTable,
  monitoringRulesTable,
  proposalsTable,
  tenderAnalysisTable,
  tendersTable,
} from "@workspace/db";
import { db } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";

const router = Router();
router.use(authenticate);

const asArray = (value: unknown): string[] => Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : [];
const money = (value: unknown) => value === undefined || value === null || value === "" ? undefined : String(value);
const parseJsonArray = <T>(value: unknown): T[] => Array.isArray(value) ? value as T[] : [];

function daysUntil(date: string | null | undefined) {
  if (!date) return null;
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000);
}

function buildSummary(tender: typeof tendersTable.$inferSelect) {
  const value = tender.estimatedValue ? Number(tender.estimatedValue) : 0;
  const emd = tender.emdAmount ? Number(tender.emdAmount) : 0;
  const deadlineDays = daysUntil(tender.closingDate);
  const tightDeadline = deadlineDays !== null && deadlineDays <= 7;
  const highEmd = value > 0 && emd / value > 0.02;
  const riskScore = tightDeadline || highEmd ? "yellow" : "green";

  return {
    scopeSummary: tender.description || `${tender.category} work for ${tender.authority}. Review full tender documents before pricing.`,
    eligibilityCriteria: tender.eligibilityCriteria || "Check turnover, similar work experience, GST/PAN, technical certifications, and OEM authorization where applicable.",
    importantDates: [
      { label: "Opening date", date: tender.openingDate },
      { label: "Pre-bid meeting", date: tender.preBidDate },
      { label: "Submission deadline", date: tender.closingDate },
    ].filter((item) => item.date),
    emdSecurity: tender.emdAmount ? `EMD/security amount is ${tender.emdAmount}. Validate exemption eligibility before final bid.` : "No EMD value captured yet.",
    paymentTerms: tender.paymentTerms || "Payment terms are not captured yet. Add the clause from tender documents for cash-flow analysis.",
    penaltyClauses: tender.penalties || "Penalty clauses are not captured yet. Check LD, SLA, warranty, and blacklisting language.",
    hiddenRiskClauses: tender.hiddenClauses ? [tender.hiddenClauses] : [
      tightDeadline ? "Short submission window may increase document and pricing risk." : "No deadline pressure detected from captured dates.",
      highEmd ? "EMD appears high relative to tender value." : "EMD ratio does not look unusually high from captured values.",
      "Confirm OEM authorization and past-project evidence before approval.",
    ],
    riskScore,
  };
}

router.get("/monitoring-rules", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const rules = await db
    .select()
    .from(monitoringRulesTable)
    .where(eq(monitoringRulesTable.tenantId, tenantId))
    .orderBy(desc(monitoringRulesTable.createdAt));
  res.json(rules);
});

router.post("/monitoring-rules", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const keywords = asArray(req.body.keywords);
  if (!req.body.name || keywords.length === 0) {
    res.status(400).json({ error: "name and keywords are required" });
    return;
  }

  const [rule] = await db.insert(monitoringRulesTable).values({
    tenantId,
    name: String(req.body.name),
    keywords,
    sources: asArray(req.body.sources),
    categories: asArray(req.body.categories),
    states: asArray(req.body.states),
    authorities: asArray(req.body.authorities),
    minValue: money(req.body.minValue),
    maxValue: money(req.body.maxValue),
  }).returning();

  res.status(201).json(rule);
});

router.post("/monitoring-rules/:id/run", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const [rule] = await db
    .select()
    .from(monitoringRulesTable)
    .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
    .limit(1);

  if (!rule) {
    res.status(404).json({ error: "Monitoring rule not found" });
    return;
  }

  const keywords = parseJsonArray<string>(rule.keywords);
  const sources = parseJsonArray<string>(rule.sources);
  const categories = parseJsonArray<string>(rule.categories);
  const states = parseJsonArray<string>(rule.states);
  const authorities = parseJsonArray<string>(rule.authorities);

  const keywordConditions = keywords.flatMap((keyword) => [
    ilike(tendersTable.title, `%${keyword}%`),
    ilike(tendersTable.authority, `%${keyword}%`),
    ilike(tendersTable.category, `%${keyword}%`),
  ]);
  const conditions = [eq(tendersTable.tenantId, tenantId)];

  if (keywordConditions.length > 0) conditions.push(or(...keywordConditions)!);
  if (sources.length > 0) conditions.push(or(...sources.map((source) => eq(tendersTable.source, source)))!);
  if (categories.length > 0) conditions.push(or(...categories.map((category) => eq(tendersTable.category, category)))!);
  if (states.length > 0) conditions.push(or(...states.map((state) => eq(tendersTable.state, state)))!);
  if (authorities.length > 0) conditions.push(or(...authorities.map((authority) => ilike(tendersTable.authority, `%${authority}%`)))!);
  if (rule.minValue) conditions.push(gte(tendersTable.estimatedValue, rule.minValue));
  if (rule.maxValue) conditions.push(lte(tendersTable.estimatedValue, rule.maxValue));

  const matches = await db.select().from(tendersTable).where(and(...conditions)).orderBy(desc(tendersTable.createdAt)).limit(25);
  await db.update(monitoringRulesTable).set({ lastRunAt: new Date(), updatedAt: new Date() }).where(eq(monitoringRulesTable.id, id));

  res.json({ ruleId: id, matchCount: matches.length, matches });
});

router.post("/tenders/:id/summary", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId))).limit(1);
  if (!tender) {
    res.status(404).json({ error: "Tender not found" });
    return;
  }

  const summary = buildSummary(tender);
  const [analysis] = await db.insert(tenderAnalysisTable).values({
    tenantId,
    tenderId: tender.id,
    eligibilityScore: summary.riskScore === "green" ? "78" : "64",
    riskScore: summary.riskScore,
    eligibilityCriteria: [{ criterion: summary.eligibilityCriteria, met: true, notes: "Generated from captured tender details" }],
    keyDeadlines: summary.importantDates,
    riskFactors: summary.hiddenRiskClauses.map((factor) => ({ factor, severity: factor.includes("Short") || factor.includes("high") ? "medium" : "low" })),
    hiddenClauses: summary.hiddenRiskClauses,
    turnoverRequired: "5000000",
    certifications: ["GST", "PAN", "Relevant OEM or ISO certification"],
    emdAmount: tender.emdAmount || "0",
    paymentTerms: summary.paymentTerms,
    aiSummary: summary.scopeSummary,
  }).returning();

  await db.update(tendersTable).set({
    aiSummary: summary.scopeSummary,
    riskScore: summary.riskScore,
    paymentTerms: summary.paymentTerms,
    penalties: summary.penaltyClauses,
    hiddenClauses: summary.hiddenRiskClauses.join("\n"),
    updatedAt: new Date(),
  }).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)));

  res.json({ ...summary, analysisId: analysis.id });
});

router.get("/dashboard", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const [tenders, bids, documents, profile, proposals, rules] = await Promise.all([
    db.select().from(tendersTable).where(eq(tendersTable.tenantId, tenantId)).orderBy(desc(tendersTable.createdAt)).limit(8),
    db.select().from(bidsTable).where(eq(bidsTable.tenantId, tenantId)).orderBy(desc(bidsTable.updatedAt)).limit(50),
    db.select().from(documentsTable).where(eq(documentsTable.tenantId, tenantId)).orderBy(desc(documentsTable.createdAt)).limit(50),
    db.select().from(companyProfileTable).where(eq(companyProfileTable.tenantId, tenantId)).limit(1),
    db.select().from(proposalsTable).orderBy(desc(proposalsTable.createdAt)).limit(20),
    db.select().from(monitoringRulesTable).where(eq(monitoringRulesTable.tenantId, tenantId)).orderBy(desc(monitoringRulesTable.createdAt)).limit(5),
  ]);

  const now = Date.now();
  const expiringDocuments = documents.filter((doc) => doc.expiryDate && new Date(doc.expiryDate).getTime() - now <= 30 * 86400000).length;
  const stageCounts = bids.reduce<Record<string, number>>((acc, bid) => {
    acc[bid.stage] = (acc[bid.stage] || 0) + 1;
    return acc;
  }, {});

  res.json({
    monitoring: {
      activeRules: rules.filter((rule) => rule.isActive).length,
      rules,
      recentMatches: tenders.filter((tender) => tender.isTracked || tender.status === "open").slice(0, 5),
    },
    aiSummary: tenders.filter((tender) => tender.aiSummary).slice(0, 3),
    goNoGo: tenders.slice(0, 5).map((tender) => {
      const value = Number(tender.estimatedValue || 0);
      const deadline = daysUntil(tender.closingDate);
      const score = Math.max(35, Math.min(92, 72 + (value > 1000000 ? 8 : 0) - (deadline !== null && deadline < 5 ? 18 : 0)));
      return {
        tenderId: tender.id,
        title: tender.title,
        score,
        decision: score >= 70 ? "bid" : score < 50 ? "skip" : "review",
      };
    }),
    eligibility: {
      profileComplete: Boolean(profile[0]?.companyName && profile[0]?.annualTurnover),
      documentsAvailable: documents.length,
      expiringDocuments,
      certifications: parseJsonArray<string>(profile[0]?.certifications),
    },
    documents: {
      total: documents.length,
      expiringDocuments,
      categories: documents.reduce<Record<string, number>>((acc, doc) => {
        acc[doc.category] = (acc[doc.category] || 0) + 1;
        return acc;
      }, {}),
    },
    bids: {
      stageCounts,
      active: bids.filter((bid) => ["shortlisted", "in_progress", "submitted"].includes(bid.stage)).length,
    },
    proposals: {
      total: proposals.length,
      recent: proposals.slice(0, 5),
      templates: ["cover_letter", "technical", "compliance_matrix", "deviation", "company_intro", "past_experience"],
    },
  });
});

router.post("/proposals/generate", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { bidId, type = "technical", title } = req.body;
  if (!bidId) {
    res.status(400).json({ error: "bidId is required" });
    return;
  }

  const [bid] = await db.select().from(bidsTable).where(and(eq(bidsTable.id, Number(bidId)), eq(bidsTable.tenantId, tenantId))).limit(1);
  if (!bid) {
    res.status(404).json({ error: "Bid not found" });
    return;
  }
  const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, bid.tenderId), eq(tendersTable.tenantId, tenantId))).limit(1);

  const content = [
    `Proposal Type: ${type}`,
    `Tender: ${tender?.title || `Tender #${bid.tenderId}`}`,
    `Authority: ${tender?.authority || "Authority not captured"}`,
    "",
    "Executive Summary",
    `We understand the scope and compliance requirements for ${tender?.category || "this procurement"}. Our response is structured to meet eligibility, technical, commercial, and delivery expectations.`,
    "",
    "Compliance Matrix",
    "- Eligibility documents: To be attached from Document Vault",
    "- Technical requirements: To be mapped against tender specifications",
    "- Deviation statement: No deviations unless reviewed by management",
    "",
    "Past Experience",
    "Relevant work orders, completion certificates, and OEM authorizations should be attached before final approval.",
  ].join("\n");

  const [proposal] = await db.insert(proposalsTable).values({
    bidId: bid.id,
    version: 1,
    type,
    title: title || `${type.replace(/_/g, " ")} proposal`,
    content,
    status: "draft",
  }).returning();

  await db.insert(activityLogsTable).values({
    tenantId,
    type: "proposal_created",
    entityType: "proposal",
    entityId: proposal.id,
    entityName: proposal.title,
    description: `Generated ${type} proposal draft for bid #${bid.id}`,
  });

  res.status(201).json(proposal);
});

export default router;
