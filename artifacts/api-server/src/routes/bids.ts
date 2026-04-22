import { Router } from "express";
import { db } from "@workspace/db";
import { bidsTable, bidTasksTable, tendersTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, desc } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { stage } = req.query as Record<string, string>;
  const conditions = [eq(bidsTable.tenantId, tenantId)];
  if (stage) conditions.push(eq(bidsTable.stage, stage));

  const bids = await db.select().from(bidsTable).where(and(...conditions)).orderBy(desc(bidsTable.createdAt));
  const tenderIds = [...new Set(bids.map(b => b.tenderId))];
  let tenders: any[] = [];
  if (tenderIds.length > 0) {
    tenders = await db.select().from(tendersTable).where(eq(tendersTable.tenantId, tenantId));
  }
  const tenderMap = Object.fromEntries(tenders.map(t => [t.id, t]));
  const data = bids.map(b => ({ ...b, tender: tenderMap[b.tenderId] }));
  res.json({ data, total: data.length });
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { tenderId, stage = "shortlisted", notes, targetValue, submissionDate } = req.body;
  if (!tenderId) { res.status(400).json({ error: "tenderId required" }); return; }

  const [tender] = await db.select().from(tendersTable).where(and(eq(tendersTable.id, tenderId), eq(tendersTable.tenantId, tenantId))).limit(1);
  if (!tender) { res.status(404).json({ error: "Tender not found" }); return; }

  const [bid] = await db.insert(bidsTable).values({
    tenantId, tenderId, stage,
    notes, targetValue: targetValue?.toString(), submissionDate,
  }).returning();

  await db.update(tendersTable).set({ isTracked: true, updatedAt: new Date() }).where(eq(tendersTable.id, tenderId));

  await db.insert(activityLogsTable).values({
    tenantId, type: "bid_created", entityType: "bid", entityId: bid.id, entityName: tender.title,
    description: `Bid created for ${tender.title}`,
  });

  res.status(201).json({ ...bid, tender });
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const [bid] = await db.select().from(bidsTable).where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId))).limit(1);
  if (!bid) { res.status(404).json({ error: "Not found" }); return; }
  const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
  res.json({ ...bid, tender });
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const { stage, notes, targetValue, submissionDate, wonValue, lostReason } = req.body;

  const [oldBid] = await db.select().from(bidsTable).where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId))).limit(1);
  if (!oldBid) { res.status(404).json({ error: "Not found" }); return; }

  const [bid] = await db.update(bidsTable).set({
    stage, notes, targetValue: targetValue?.toString(), submissionDate,
    wonValue: wonValue?.toString(), lostReason, updatedAt: new Date(),
  }).where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId))).returning();

  if (stage && stage !== oldBid.stage) {
    const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
    await db.insert(activityLogsTable).values({
      tenantId, type: "bid_stage_changed", entityType: "bid", entityId: bid.id, entityName: tender?.title || "Tender",
      description: `Bid moved to ${stage}`,
    });
  }

  const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
  res.json({ ...bid, tender });
});

router.get("/:id/tasks", async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const tasks = await db.select().from(bidTasksTable).where(eq(bidTasksTable.bidId, id)).orderBy(bidTasksTable.id);
  res.json(tasks);
});

router.post("/:id/tasks", async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const { title, description, assignedRole, dueDate } = req.body;
  if (!title) { res.status(400).json({ error: "title required" }); return; }
  const [task] = await db.insert(bidTasksTable).values({ bidId: id, title, description, assignedRole, dueDate, status: "pending" }).returning();
  res.status(201).json(task);
});

export default router;
