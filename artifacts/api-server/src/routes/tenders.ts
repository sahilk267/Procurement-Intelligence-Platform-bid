import { Router } from "express";
import { db } from "@workspace/db";
import { tendersTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, or, ilike, gte, lte, desc, count } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const { q, category, state, status, source, minValue, maxValue, page = "1", limit = "20" } = req.query as Record<string, string>;
  const tenantId = req.tenantId!;
  const offset = (parseInt(page) - 1) * parseInt(limit);

  const conditions = [eq(tendersTable.tenantId, tenantId)];
  if (status) conditions.push(eq(tendersTable.status, status));
  if (category) conditions.push(eq(tendersTable.category, category));
  if (state) conditions.push(eq(tendersTable.state, state));
  if (source) conditions.push(eq(tendersTable.source, source));
  if (q) conditions.push(ilike(tendersTable.title, `%${q}%`));
  if (minValue) conditions.push(gte(tendersTable.estimatedValue, minValue));
  if (maxValue) conditions.push(lte(tendersTable.estimatedValue, maxValue));

  const [data, totalResult] = await Promise.all([
    db.select().from(tendersTable).where(and(...conditions)).orderBy(desc(tendersTable.createdAt)).limit(parseInt(limit)).offset(offset),
    db.select({ count: count() }).from(tendersTable).where(and(...conditions)),
  ]);

  res.json({ data, total: totalResult[0].count, page: parseInt(page), limit: parseInt(limit) });
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { title, referenceNumber, authority, category, state, estimatedValue, emdAmount, source, openingDate, closingDate, preBidDate, description, eligibilityCriteria } = req.body;

  if (!title || !authority || !category || !source) {
    res.status(400).json({ error: "title, authority, category, source required" });
    return;
  }

  const [tender] = await db.insert(tendersTable).values({
    tenantId, title, referenceNumber, authority, category, state,
    estimatedValue: estimatedValue?.toString(), emdAmount: emdAmount?.toString(),
    source, openingDate, closingDate, preBidDate, description, eligibilityCriteria,
    status: "open",
  }).returning();

  await db.insert(activityLogsTable).values({
    tenantId, type: "tender_added", entityType: "tender", entityId: tender.id, entityName: title, description: `Tender added: ${title}`,
  });

  res.status(201).json(tender);
});

router.get("/watchlist", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { q = "", category = "all", source = "all", status = "all", closingWithin = "all" } = req.query as Record<string, string>;
  const conditions = [eq(tendersTable.tenantId, tenantId), eq(tendersTable.isTracked, true)];

  if (q) {
    conditions.push(or(
      ilike(tendersTable.title, `%${q}%`),
      ilike(tendersTable.authority, `%${q}%`),
      ilike(tendersTable.referenceNumber, `%${q}%`)
    )!);
  }
  if (category !== "all") conditions.push(eq(tendersTable.category, category));
  if (source !== "all") conditions.push(eq(tendersTable.source, source));
  if (status !== "all") conditions.push(eq(tendersTable.status, status));
  if (closingWithin !== "all") {
    const days = parseInt(closingWithin);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    conditions.push(lte(tendersTable.closingDate, threshold.toISOString().slice(0, 10)));
  }

  const data = await db.select().from(tendersTable).where(and(...conditions)).orderBy(desc(tendersTable.updatedAt));
  res.json({ data, total: data.length });
});

router.post("/watchlist", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { keywords, source = "all", category = "all", closingWithin = "all", notes = "" } = req.body;

  if (!Array.isArray(keywords) || keywords.length === 0) {
    res.status(400).json({ error: "keywords required" });
    return;
  }

  const normalized = keywords.map((keyword: string) => keyword.trim()).filter(Boolean);
  if (normalized.length === 0) {
    res.status(400).json({ error: "keywords required" });
    return;
  }

  const query = normalized.map((keyword) => ilike(tendersTable.title, `%${keyword}%`)).reduce((acc, expr) => or(acc, expr)!);
  const conditions = [eq(tendersTable.tenantId, tenantId), or(query, ilike(tendersTable.authority, `%${normalized[0]}%`))!];

  if (source !== "all") conditions.push(eq(tendersTable.source, source));
  if (category !== "all") conditions.push(eq(tendersTable.category, category));
  if (closingWithin !== "all") {
    const days = parseInt(closingWithin);
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + days);
    conditions.push(lte(tendersTable.closingDate, threshold.toISOString().slice(0, 10)));
  }

  const matches = await db.select().from(tendersTable).where(and(...conditions)).orderBy(desc(tendersTable.createdAt));

  res.status(201).json({
    keywords: normalized,
    source,
    category,
    closingWithin,
    notes,
    matchCount: matches.length,
    matches: matches.slice(0, 10),
  });
});

router.post("/:id/track", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const [updated] = await db.update(tendersTable)
    .set({ isTracked: true, updatedAt: new Date() })
    .where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.post("/:id/untrack", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const [updated] = await db.update(tendersTable)
    .set({ isTracked: false, updatedAt: new Date() })
    .where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId))).limit(1);
  if (!tender) { res.status(404).json({ error: "Not found" }); return; }
  res.json(tender);
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const { title, status, riskScore, aiSummary } = req.body;
  const [updated] = await db.update(tendersTable)
    .set({ title, status, riskScore, aiSummary, updatedAt: new Date() })
    .where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)))
    .returning();
  if (!updated) { res.status(404).json({ error: "Not found" }); return; }
  res.json(updated);
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  await db.delete(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
