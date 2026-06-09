import { Router } from "express";
import { db } from "@workspace/db";
import { monitoringRulesTable, tendersTable, activityLogsTable, usersTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, or, ilike, contains, desc, count, sql } from "drizzle-orm";
import { sendTenderAlert } from "../lib/notifications";

const router = Router();
router.use(authenticate);

// CREATE monitoring rule (keyword alert)
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { name, keywords = [], sources = [], categories = [], states = [], authorities = [], minValue, maxValue } = req.body;

    if (!name || keywords.length === 0) {
      res.status(400).json({ error: "name and keywords required" });
      return;
    }

    const [rule] = await db.insert(monitoringRulesTable).values({
      tenantId,
      createdBy: userId,
      updatedBy: userId,
      name,
      keywords: keywords.length > 0 ? keywords : null,
      sources: sources.length > 0 ? sources : null,
      categories: categories.length > 0 ? categories : null,
      states: states.length > 0 ? states : null,
      authorities: authorities.length > 0 ? authorities : null,
      minValue: minValue || null,
      maxValue: maxValue || null,
      isActive: true,
    }).returning();

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "alert_created",
      entityType: "alert",
      entityId: rule.id,
      entityName: name,
      description: `Keyword alert created: ${name}`,
    });

    res.status(201).json(rule);
  } catch (error) {
    console.error("Error creating monitoring rule:", error);
    res.status(500).json({ error: "Failed to create monitoring rule" });
  }
});

// GET all monitoring rules for tenant
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { active = "true", page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(monitoringRulesTable.tenantId, tenantId)];
    if (active === "true") {
      conditions.push(eq(monitoringRulesTable.isActive, true));
    }

    const [data, totalResult] = await Promise.all([
      db.select().from(monitoringRulesTable)
        .where(and(...conditions))
        .orderBy(desc(monitoringRulesTable.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: count() }).from(monitoringRulesTable).where(and(...conditions)),
    ]);

    res.json({ data, total: totalResult[0].count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching monitoring rules:", error);
    res.status(500).json({ error: "Failed to fetch monitoring rules" });
  }
});

// GET single monitoring rule
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid rule ID" });
      return;
    }

    const [rule] = await db.select().from(monitoringRulesTable)
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
      .limit(1);

    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }

    // Get matching tenders for this rule
    const conditions = [eq(tendersTable.tenantId, tenantId)];

    if (rule.keywords && Array.isArray(rule.keywords)) {
      const keywordConditions = rule.keywords.map((kw: string) =>
        ilike(tendersTable.title, `%${kw}%`)
      ).reduce((acc, cond) => or(acc, cond)!);
      conditions.push(keywordConditions);
    }

    if (rule.categories) conditions.push(or(...(rule.categories as any[]).map((cat: string) => eq(tendersTable.category, cat))));
    if (rule.states) conditions.push(or(...(rule.states as any[]).map((state: string) => eq(tendersTable.state, state))));
    if (rule.sources) conditions.push(or(...(rule.sources as any[]).map((src: string) => eq(tendersTable.source, src))));

    const matches = await db.select().from(tendersTable)
      .where(and(...conditions))
      .orderBy(desc(tendersTable.createdAt))
      .limit(50);

    res.json({ rule, matchedTenders: matches, matchCount: matches.length });
  } catch (error) {
    console.error("Error fetching monitoring rule:", error);
    res.status(500).json({ error: "Failed to fetch monitoring rule" });
  }
});

// UPDATE monitoring rule
router.put("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid rule ID" });
      return;
    }

    const [existing] = await db.select().from(monitoringRulesTable)
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
      .limit(1);

    if (!existing) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }

    const updateData: any = { updatedBy: userId, updatedAt: new Date() };
    if (req.body.name) updateData.name = req.body.name;
    if (req.body.keywords) updateData.keywords = req.body.keywords;
    if (req.body.categories) updateData.categories = req.body.categories;
    if (req.body.states) updateData.states = req.body.states;
    if (req.body.sources) updateData.sources = req.body.sources;
    if (req.body.authorities) updateData.authorities = req.body.authorities;
    if (req.body.minValue !== undefined) updateData.minValue = req.body.minValue;
    if (req.body.maxValue !== undefined) updateData.maxValue = req.body.maxValue;
    if (req.body.isActive !== undefined) updateData.isActive = req.body.isActive;

    const [updated] = await db.update(monitoringRulesTable)
      .set(updateData)
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
      .returning();

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "alert_updated",
      entityType: "alert",
      entityId: id,
      entityName: updated.name,
      description: `Keyword alert updated: ${updated.name}`,
    });

    res.json(updated);
  } catch (error) {
    console.error("Error updating monitoring rule:", error);
    res.status(500).json({ error: "Failed to update monitoring rule" });
  }
});

// DELETE monitoring rule
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid rule ID" });
      return;
    }

    const [rule] = await db.select().from(monitoringRulesTable)
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
      .limit(1);

    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }

    await db.delete(monitoringRulesTable)
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)));

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "alert_deleted",
      entityType: "alert",
      entityId: id,
      entityName: rule.name,
      description: `Keyword alert deleted: ${rule.name}`,
    });

    res.json({ success: true, message: "Rule deleted" });
  } catch (error) {
    console.error("Error deleting monitoring rule:", error);
    res.status(500).json({ error: "Failed to delete monitoring rule" });
  }
});

// TOGGLE monitoring rule active/inactive
router.post("/:id/toggle", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid rule ID" });
      return;
    }

    const [rule] = await db.select().from(monitoringRulesTable)
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
      .limit(1);

    if (!rule) {
      res.status(404).json({ error: "Rule not found" });
      return;
    }

    const [updated] = await db.update(monitoringRulesTable)
      .set({
        isActive: !rule.isActive,
        updatedBy: userId,
        updatedAt: new Date(),
      })
      .where(and(eq(monitoringRulesTable.id, id), eq(monitoringRulesTable.tenantId, tenantId)))
      .returning();

    res.json(updated);
  } catch (error) {
    console.error("Error toggling monitoring rule:", error);
    res.status(500).json({ error: "Failed to toggle monitoring rule" });
  }
});

// Trigger notifications for new tender matches (can be called by cron job or manually)
router.post("/check-and-notify", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;

    // Get all active monitoring rules for this tenant
    const activeRules = await db.select().from(monitoringRulesTable)
      .where(and(eq(monitoringRulesTable.tenantId, tenantId), eq(monitoringRulesTable.isActive, true)));

    if (activeRules.length === 0) {
      return res.json({ message: "No active rules found", notificationsSent: 0 });
    }

    let totalNotifications = 0;

    // Check each rule for new matches (created in last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    for (const rule of activeRules) {
      const conditions = [
        eq(tendersTable.tenantId, tenantId),
        sql`${tendersTable.createdAt} >= ${yesterday}`
      ];

      // Add rule-specific conditions
      if (rule.keywords && Array.isArray(rule.keywords)) {
        const keywordConditions = rule.keywords.map((kw: string) =>
          ilike(tendersTable.title, `%${kw}%`)
        ).reduce((acc, cond) => or(acc, cond)!);
        conditions.push(keywordConditions);
      }

      if (rule.categories) conditions.push(or(...(rule.categories as any[]).map((cat: string) => eq(tendersTable.category, cat))));
      if (rule.states) conditions.push(or(...(rule.states as any[]).map((state: string) => eq(tendersTable.state, state))));
      if (rule.sources) conditions.push(or(...(rule.sources as any[]).map((src: string) => eq(tendersTable.source, src))));

      const newMatches = await db.select().from(tendersTable)
        .where(and(...conditions))
        .orderBy(desc(tendersTable.createdAt))
        .limit(10); // Limit to prevent spam

      if (newMatches.length > 0) {
        // Get user info for notifications
        const [user] = await db.select({
          email: usersTable.email,
          name: usersTable.name
        }).from(usersTable)
          .where(eq(usersTable.id, rule.createdBy))
          .limit(1);

        if (user && user.email) {
          // Send notification for each new match
          for (const tender of newMatches) {
            await sendTenderAlert({
              userEmail: user.email,
              userName: user.name,
              ruleName: rule.name,
              tenderTitle: tender.title,
              tenderId: tender.id,
              authority: tender.authority,
              estimatedValue: tender.estimatedValue || 'N/A',
              closingDate: tender.closingDate || 'N/A',
              matchCount: newMatches.length
            });
            totalNotifications++;
          }
        }
      }
    }

    res.json({
      message: `Checked ${activeRules.length} rules`,
      notificationsSent: totalNotifications
    });
  } catch (error) {
    console.error("Error checking and notifying:", error);
    res.status(500).json({ error: "Failed to check and notify" });
  }
});

export default router;
