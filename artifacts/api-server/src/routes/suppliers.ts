import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable, activityLogsTable, companyProfileTable, competitorRecordsTable, usersTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, or, ilike, desc, count, avg, sql } from "drizzle-orm";

const router = Router();
router.use(authenticate);

// GET all suppliers for tenant
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { q = "", type = "", category = "", rating = "", page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(vendorsTable.tenantId, tenantId)];
    if (q) conditions.push(ilike(vendorsTable.companyName, `%${q}%`));
    if (type) conditions.push(eq(vendorsTable.type, type));
    if (rating) conditions.push(sql`${vendorsTable.rating} >= ${parseFloat(rating)}`);

    const [data, totalResult] = await Promise.all([
      db.select().from(vendorsTable)
        .where(and(...conditions))
        .orderBy(desc(vendorsTable.rating))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: count() }).from(vendorsTable).where(and(...conditions)),
    ]);

    res.json({ data, total: totalResult[0].count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    res.status(500).json({ error: "Failed to fetch suppliers" });
  }
});

// CREATE a new supplier/vendor
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { companyName, contactName, email, phone, type, categories = [], oemProducts = [], notes = "" } = req.body;

    if (!companyName || !type) {
      res.status(400).json({ error: "companyName and type required" });
      return;
    }

    const [vendor] = await db.insert(vendorsTable).values({
      tenantId,
      createdBy: userId,
      updatedBy: userId,
      companyName,
      contactName: contactName || null,
      email: email || null,
      phone: phone || null,
      type,
      categories: categories.length > 0 ? categories : null,
      oemProducts: oemProducts.length > 0 ? oemProducts : null,
      rating: 0,
      notes: notes || null,
    }).returning();

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "supplier_created",
      entityType: "supplier",
      entityId: vendor.id,
      entityName: companyName,
      description: `Supplier added: ${companyName}`,
    });

    res.status(201).json(vendor);
  } catch (error) {
    console.error("Error creating supplier:", error);
    res.status(500).json({ error: "Failed to create supplier" });
  }
});

// GET single supplier by ID
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid supplier ID" });
      return;
    }

    const [vendor] = await db.select().from(vendorsTable)
      .where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId)))
      .limit(1);

    if (!vendor) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    // Get performance history
    const history = await db.select().from(competitorRecordsTable)
      .where(and(eq(competitorRecordsTable.tenantId, tenantId), eq(competitorRecordsTable.companyName, vendor.companyName)))
      .orderBy(desc(competitorRecordsTable.createdAt))
      .limit(10);

    res.json({ ...vendor, performanceHistory: history });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    res.status(500).json({ error: "Failed to fetch supplier" });
  }
});

// UPDATE supplier
router.put("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid supplier ID" });
      return;
    }

    const [existing] = await db.select().from(vendorsTable)
      .where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    const updateData: any = { updatedBy: userId, updatedAt: new Date() };
    if (req.body.companyName) updateData.companyName = req.body.companyName;
    if (req.body.contactName) updateData.contactName = req.body.contactName;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.phone) updateData.phone = req.body.phone;
    if (req.body.notes) updateData.notes = req.body.notes;
    if (req.body.categories) updateData.categories = req.body.categories;
    if (req.body.oemProducts) updateData.oemProducts = req.body.oemProducts;
    if (req.body.rating !== undefined) updateData.rating = parseFloat(req.body.rating);

    const [updated] = await db.update(vendorsTable)
      .set(updateData)
      .where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId)))
      .returning();

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "supplier_updated",
      entityType: "supplier",
      entityId: id,
      entityName: updated.companyName,
      description: `Supplier updated: ${updated.companyName}`,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating supplier:", error);
    res.status(500).json({ error: "Failed to update supplier" });
  }
});

// DELETE supplier
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid supplier ID" });
      return;
    }

    const [vendor] = await db.select().from(vendorsTable)
      .where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId)))
      .limit(1);

    if (!vendor) {
      res.status(404).json({ error: "Supplier not found" });
      return;
    }

    await db.delete(vendorsTable).where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId)));

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "supplier_deleted",
      entityType: "supplier",
      entityId: id,
      entityName: vendor.companyName,
      description: `Supplier deleted: ${vendor.companyName}`,
    });

    res.json({ success: true, message: "Supplier deleted" });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    res.status(500).json({ error: "Failed to delete supplier" });
  }
});

// GET supplier matching algorithm - Find best suppliers for tender categories
router.post("/match/find", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { categories = [], minRating = 0, limit = 10 } = req.body;

    if (categories.length === 0) {
      res.status(400).json({ error: "categories required for matching" });
      return;
    }

    // Find suppliers with matching categories
    const suppliers = await db.select().from(vendorsTable)
      .where(and(
        eq(vendorsTable.tenantId, tenantId),
        sql`${vendorsTable.rating} >= ${minRating}`
      ))
      .orderBy(desc(vendorsTable.rating))
      .limit(parseInt(limit as any));

    // Score suppliers based on category match
    const scored = suppliers.map((supplier) => {
      const categoryMatches = supplier.categories
        ? supplier.categories.filter((cat: string) => categories.includes(cat)).length
        : 0;
      const matchScore = categoryMatches > 0 ? (categoryMatches / Math.max(categories.length, 1)) * 100 : 0;
      return { ...supplier, matchScore, categoryMatches };
    });

    res.json(scored.sort((a, b) => b.matchScore - a.matchScore));
  } catch (error) {
    console.error("Error matching suppliers:", error);
    res.status(500).json({ error: "Failed to match suppliers" });
  }
});

// GET supplier analytics
router.get("/analytics/summary", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;

    const [totalSuppliers] = await db.select({ count: count() })
      .from(vendorsTable)
      .where(eq(vendorsTable.tenantId, tenantId));

    const [avgRating] = await db.select({ avg: avg(vendorsTable.rating) })
      .from(vendorsTable)
      .where(eq(vendorsTable.tenantId, tenantId));

    const typeStats = await db.select({
      type: vendorsTable.type,
      count: count(),
      avgRating: avg(vendorsTable.rating),
    })
      .from(vendorsTable)
      .where(eq(vendorsTable.tenantId, tenantId))
      .groupBy(vendorsTable.type);

    res.json({
      totalSuppliers: totalSuppliers.count,
      averageRating: avgRating.avg || 0,
      byType: typeStats,
    });
  } catch (error) {
    console.error("Error fetching supplier analytics:", error);
    res.status(500).json({ error: "Failed to fetch supplier analytics" });
  }
});

export default router;
