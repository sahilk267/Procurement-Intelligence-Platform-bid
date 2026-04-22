import { Router } from "express";
import { db } from "@workspace/db";
import { clarificationsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const { bidId, status } = req.query as Record<string, string>;
  const conditions = [];
  if (bidId) conditions.push(eq(clarificationsTable.bidId, parseInt(bidId)));
  if (status) conditions.push(eq(clarificationsTable.status, status));
  const items = conditions.length
    ? await db.select().from(clarificationsTable).where(and(...conditions))
    : await db.select().from(clarificationsTable);
  res.json(items);
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const { bidId, question } = req.body;
  if (!bidId || !question) { res.status(400).json({ error: "bidId and question required" }); return; }
  const [item] = await db.insert(clarificationsTable).values({ bidId, question, status: "pending" }).returning();
  res.status(201).json(item);
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const id = parseInt(req.params.id);
  const { status, answer } = req.body;
  const updates: any = { status };
  if (answer) updates.answer = answer;
  if (status === "submitted") updates.submittedAt = new Date();
  if (status === "replied") updates.repliedAt = new Date();
  const [item] = await db.update(clarificationsTable).set(updates).where(eq(clarificationsTable.id, id)).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json(item);
});

export default router;
