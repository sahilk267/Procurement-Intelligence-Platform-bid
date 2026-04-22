import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authenticate);

function enrichDocument(doc: any) {
  const now = new Date();
  const expiry = doc.expiryDate ? new Date(doc.expiryDate) : null;
  const isExpired = expiry ? expiry < now : false;
  const daysUntilExpiry = expiry ? Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : null;
  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry <= 30 && daysUntilExpiry > 0;
  return { ...doc, isExpired, isExpiringSoon };
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { category } = req.query as Record<string, string>;
  const conditions = [eq(documentsTable.tenantId, tenantId)];
  if (category) conditions.push(eq(documentsTable.category, category));
  const docs = await db.select().from(documentsTable).where(and(...conditions));
  res.json(docs.map(enrichDocument));
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { name, category, fileName, fileUrl, expiryDate } = req.body;
  if (!name || !category || !fileName) { res.status(400).json({ error: "name, category, fileName required" }); return; }
  const [doc] = await db.insert(documentsTable).values({ tenantId, name, category, fileName, fileUrl, expiryDate }).returning();
  await db.insert(activityLogsTable).values({
    tenantId, type: "document_uploaded", entityType: "document", entityId: doc.id, entityName: name,
    description: `Document uploaded: ${name}`,
  });
  res.status(201).json(enrichDocument(doc));
});

router.get("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const [doc] = await db.select().from(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.tenantId, tenantId))).limit(1);
  if (!doc) { res.status(404).json({ error: "Not found" }); return; }
  res.json(enrichDocument(doc));
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  await db.delete(documentsTable).where(and(eq(documentsTable.id, id), eq(documentsTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
