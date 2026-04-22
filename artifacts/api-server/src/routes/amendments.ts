import { Router } from "express";
import { db } from "@workspace/db";
import { amendmentsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq } from "drizzle-orm";

const router = Router();
router.use(authenticate);

router.get("/:tenderId", async (req: AuthenticatedRequest, res) => {
  const tenderId = parseInt(req.params.tenderId);
  const amendments = await db.select().from(amendmentsTable).where(eq(amendmentsTable.tenderId, tenderId));
  res.json(amendments);
});

export default router;
