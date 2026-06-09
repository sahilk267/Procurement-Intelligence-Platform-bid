import { Router } from "express";
import { db } from "@workspace/db";
import { tendersTable, activityLogsTable, usersTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, or, ilike, gte, lte, desc, count } from "drizzle-orm";

const router = Router();
router.use(authenticate);

// GET all tenders for tenant with filters and pagination
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching tenders:", error);
    res.status(500).json({ error: "Failed to fetch tenders" });
  }
});

// CREATE a new tender
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { title, referenceNumber, authority, category, state, estimatedValue, emdAmount, source, openingDate, closingDate, preBidDate, description, eligibilityCriteria, technicalSpecs, paymentTerms } = req.body;

    if (!title || !authority || !category || !source) {
      res.status(400).json({ error: "title, authority, category, source required" });
      return;
    }

    const [tender] = await db.insert(tendersTable).values({
      tenantId,
      createdBy: userId,
      updatedBy: userId,
      title,
      referenceNumber: referenceNumber || null,
      authority,
      category,
      state: state || null,
      estimatedValue: estimatedValue?.toString() || null,
      emdAmount: emdAmount?.toString() || null,
      source,
      openingDate: openingDate || null,
      closingDate: closingDate || null,
      preBidDate: preBidDate || null,
      description: description || null,
      eligibilityCriteria: eligibilityCriteria || null,
      technicalSpecs: technicalSpecs || null,
      paymentTerms: paymentTerms || null,
      status: "open",
    }).returning();

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "tender_created",
      entityType: "tender",
      entityId: tender.id,
      entityName: title,
      description: `Tender created: ${title}`,
    });

    res.status(201).json(tender);
  } catch (error) {
    console.error("Error creating tender:", error);
    res.status(500).json({ error: "Failed to create tender" });
  }
});

// GET single tender by ID
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tender ID" });
      return;
    }

    const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId))).limit(1);
    if (!tender) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }
    res.json(tender);
  } catch (error) {
    console.error("Error fetching tender:", error);
    res.status(500).json({ error: "Failed to fetch tender" });
  }
});

// UPDATE tender
router.put("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tender ID" });
      return;
    }

    // Check if tender exists and belongs to tenant
    const [existing] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }

    const updateData: any = { updatedBy: userId, updatedAt: new Date() };
    if (req.body.title) updateData.title = req.body.title;
    if (req.body.status) updateData.status = req.body.status;
    if (req.body.description) updateData.description = req.body.description;
    if (req.body.eligibilityCriteria) updateData.eligibilityCriteria = req.body.eligibilityCriteria;
    if (req.body.technicalSpecs) updateData.technicalSpecs = req.body.technicalSpecs;
    if (req.body.paymentTerms) updateData.paymentTerms = req.body.paymentTerms;
    if (req.body.closingDate) updateData.closingDate = req.body.closingDate;
    if (req.body.estimatedValue) updateData.estimatedValue = req.body.estimatedValue?.toString();

    const [updated] = await db.update(tendersTable)
      .set(updateData)
      .where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)))
      .returning();

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "tender_updated",
      entityType: "tender",
      entityId: id,
      entityName: updated.title,
      description: `Tender updated: ${updated.title}`,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating tender:", error);
    res.status(500).json({ error: "Failed to update tender" });
  }
});

// DELETE tender
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tender ID" });
      return;
    }

    const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId))).limit(1);
    if (!tender) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }

    await db.delete(tendersTable).where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)));

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "tender_deleted",
      entityType: "tender",
      entityId: id,
      entityName: tender.title,
      description: `Tender deleted: ${tender.title}`,
    });

    res.json({ success: true, message: "Tender deleted" });
  } catch (error) {
    console.error("Error deleting tender:", error);
    res.status(500).json({ error: "Failed to delete tender" });
  }
});

// GET watchlist (tracked tenders)
router.get("/watchlist/list", async (req: AuthenticatedRequest, res) => {
  try {
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
  } catch (error) {
    console.error("Error fetching watchlist:", error);
    res.status(500).json({ error: "Failed to fetch watchlist" });
  }
});

// ADD tender to watchlist (track)
router.post("/:id/track", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tender ID" });
      return;
    }

    const [updated] = await db.update(tendersTable)
      .set({ isTracked: true, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "tender_tracked",
      entityType: "tender",
      entityId: id,
      entityName: updated.title,
      description: `Tender added to watchlist: ${updated.title}`,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error tracking tender:", error);
    res.status(500).json({ error: "Failed to track tender" });
  }
});

// REMOVE tender from watchlist (untrack)
router.post("/:id/untrack", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid tender ID" });
      return;
    }

    const [updated] = await db.update(tendersTable)
      .set({ isTracked: false, updatedBy: userId, updatedAt: new Date() })
      .where(and(eq(tendersTable.id, id), eq(tendersTable.tenantId, tenantId)))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "tender_untracked",
      entityType: "tender",
      entityId: id,
      entityName: updated.title,
      description: `Tender removed from watchlist: ${updated.title}`,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error untracking tender:", error);
    res.status(500).json({ error: "Failed to untrack tender" });
  }
});

// Watchlist routes
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
