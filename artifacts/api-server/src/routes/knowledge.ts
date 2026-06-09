import { Router } from "express";
import { db } from "@workspace/db";
import { knowledgeItemsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, ilike, sql } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { category, q } = req.query as Record<string, string>;
  const conditions = [eq(knowledgeItemsTable.tenantId, tenantId)];
  if (category) conditions.push(eq(knowledgeItemsTable.category, category));
  if (q) conditions.push(ilike(knowledgeItemsTable.title, `%${q}%`));
  const items = await db.select().from(knowledgeItemsTable).where(and(...conditions));
  res.json(items.map(item => ({ ...item, tags: item.tags || [] })));
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { title, category, content, tags } = req.body;
  if (!title || !category || !content) { res.status(400).json({ error: "title, category, content required" }); return; }
  const [item] = await db.insert(knowledgeItemsTable).values({ tenantId, title, category, content, tags: tags || [] }).returning();
  res.status(201).json({ ...item, tags: item.tags || [] });
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  const { title, category, content, tags } = req.body;
  const [item] = await db.update(knowledgeItemsTable).set({ title, category, content, tags: tags || [], updatedAt: new Date() })
    .where(and(eq(knowledgeItemsTable.id, id), eq(knowledgeItemsTable.tenantId, tenantId))).returning();
  if (!item) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...item, tags: item.tags || [] });
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = Number(req.params.id);
  await db.delete(knowledgeItemsTable).where(and(eq(knowledgeItemsTable.id, id), eq(knowledgeItemsTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
