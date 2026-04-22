import { Router } from "express";
import { db } from "@workspace/db";
import { competitorRecordsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const records = await db.select().from(competitorRecordsTable).where(eq(competitorRecordsTable.tenantId, tenantId));
  res.json(records);
});

router.post("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { companyName, tenderId, tenderTitle, awardedAmount, authority, year, category, notes } = req.body;
  if (!companyName) { res.status(400).json({ error: "companyName required" }); return; }
  const [record] = await db.insert(competitorRecordsTable).values({
    tenantId, companyName, tenderId, tenderTitle, awardedAmount: awardedAmount?.toString(), authority, year, category, notes,
  }).returning();
  res.status(201).json(record);
});

export default router;
