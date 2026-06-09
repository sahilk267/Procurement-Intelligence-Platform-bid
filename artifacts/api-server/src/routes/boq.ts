import { Router } from "express";
import { db } from "@workspace/db";
import { boqItemsTable, bidsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { bidId } = req.query as Record<string, string>;
  const conditions = [];
  if (bidId) conditions.push(eq(boqItemsTable.bidId, parseInt(bidId)));
  const items = await db.select().from(boqItemsTable).where(conditions.length ? conditions[0] : undefined);

  const enriched = items.map(item => {
    const unitCost = parseFloat(item.unitCost);
    const qty = parseFloat(item.quantity);
    const margin = item.margin ? parseFloat(item.margin) / 100 : 0;
    const gst = item.gst ? parseFloat(item.gst) / 100 : 0;
    const costBeforeGst = unitCost * qty * (1 + margin);
    const totalCost = costBeforeGst * (1 + gst);
    return { ...item, totalCost: totalCost.toFixed(2), winProbability: item.winProbability };
  });

  res.json(enriched);
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { bidId, description, unit, quantity, unitCost, margin, gst, vendorQuote } = req.body;
  if (!bidId || !description || quantity == null || unitCost == null) {
    res.status(400).json({ error: "bidId, description, quantity, unitCost required" });
    return;
  }
  const [bid] = await db.select().from(bidsTable).where(and(eq(bidsTable.id, bidId), eq(bidsTable.tenantId, tenantId))).limit(1);
  if (!bid) { res.status(404).json({ error: "Bid not found" }); return; }

  const [item] = await db.insert(boqItemsTable).values({
    bidId, description, unit, quantity: quantity.toString(), unitCost: unitCost.toString(),
    margin: margin?.toString(), gst: gst?.toString(), vendorQuote: vendorQuote?.toString(),
  }).returning();
  res.status(201).json(item);
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const id = Number(req.params.id);
  const { description, unit, quantity, unitCost, margin, gst, vendorQuote } = req.body;
  const [item] = await db.update(boqItemsTable).set({
    description, unit, quantity: quantity?.toString(), unitCost: unitCost?.toString(),
    margin: margin?.toString(), gst: gst?.toString(), vendorQuote: vendorQuote?.toString(), updatedAt: new Date(),
  }).where(eq(boqItemsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(boqItemsTable).where(eq(boqItemsTable.id, id));
  res.status(204).send();
});

export default router;
