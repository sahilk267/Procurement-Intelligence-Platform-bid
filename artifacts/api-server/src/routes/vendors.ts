import { Router } from "express";
import { db } from "@workspace/db";
import { vendorsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const vendors = await db.select().from(vendorsTable).where(eq(vendorsTable.tenantId, tenantId));
  res.json(vendors.map(v => ({ ...v, categories: v.categories || [], oemProducts: v.oemProducts || [] })));
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { companyName, contactName, email, phone, type, categories, oemProducts, rating, notes } = req.body;
  if (!companyName || !type) { res.status(400).json({ error: "companyName and type required" }); return; }
  const [vendor] = await db.insert(vendorsTable).values({
    tenantId, companyName, contactName, email, phone, type,
    categories: categories || [], oemProducts: oemProducts || [],
    rating: rating?.toString(), notes,
  }).returning();
  res.status(201).json({ ...vendor, categories: vendor.categories || [], oemProducts: vendor.oemProducts || [] });
});

router.put("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const { companyName, contactName, email, phone, type, categories, oemProducts, rating, notes } = req.body;
  const [vendor] = await db.update(vendorsTable).set({
    companyName, contactName, email, phone, type,
    categories: categories || [], oemProducts: oemProducts || [],
    rating: rating?.toString(), notes, updatedAt: new Date(),
  }).where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId))).returning();
  if (!vendor) { res.status(404).json({ error: "Not found" }); return; }
  res.json({ ...vendor, categories: vendor.categories || [], oemProducts: vendor.oemProducts || [] });
});

router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  await db.delete(vendorsTable).where(and(eq(vendorsTable.id, id), eq(vendorsTable.tenantId, tenantId)));
  res.status(204).send();
});

export default router;
