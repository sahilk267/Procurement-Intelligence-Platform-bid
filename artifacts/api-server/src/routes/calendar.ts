import { Router } from "express";
import { db } from "@workspace/db";
import { tendersTable, bidsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, sql } from "drizzle-orm";

const router = Router();
router.use(authenticate);

function getDaysRemaining(dateStr: string | null): number {
  if (!dateStr) return 999;
  const target = new Date(dateStr);
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function getUrgency(days: number): "critical" | "high" | "medium" | "low" {
  if (days <= 2) return "critical";
  if (days <= 7) return "high";
  if (days <= 14) return "medium";
  return "low";
}

router.get("/events", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { from, to } = req.query as Record<string, string>;

  const tenders = await db.select().from(tendersTable)
    .where(and(eq(tendersTable.tenantId, tenantId), eq(tendersTable.status, "open")));

  const events: any[] = [];
  let eventId = 1;

  for (const tender of tenders) {
    if (tender.closingDate) {
      const days = getDaysRemaining(tender.closingDate);
      events.push({
        id: eventId++, tenderId: tender.id, tenderTitle: tender.title,
        type: "submission_deadline", date: new Date(tender.closingDate).toISOString(),
        daysRemaining: days, urgency: getUrgency(days),
      });
    }
    if (tender.preBidDate) {
      const days = getDaysRemaining(tender.preBidDate);
      events.push({
        id: eventId++, tenderId: tender.id, tenderTitle: tender.title,
        type: "pre_bid_meeting", date: new Date(tender.preBidDate).toISOString(),
        daysRemaining: days, urgency: getUrgency(days),
      });
    }
    if (tender.openingDate) {
      const days = getDaysRemaining(tender.openingDate);
      events.push({
        id: eventId++, tenderId: tender.id, tenderTitle: tender.title,
        type: "opening_date", date: new Date(tender.openingDate).toISOString(),
        daysRemaining: days, urgency: getUrgency(days),
      });
    }
  }

  events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  res.json(events);
});

router.get("/upcoming", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const tenders = await db.select().from(tendersTable)
    .where(and(eq(tendersTable.tenantId, tenantId), eq(tendersTable.status, "open"),
      sql`${tendersTable.closingDate} is not null AND ${tendersTable.closingDate}::date >= current_date`));

  const events = tenders
    .filter(t => t.closingDate)
    .map((t, i) => {
      const days = getDaysRemaining(t.closingDate!);
      return { id: i + 1, tenderId: t.id, tenderTitle: t.title, type: "submission_deadline" as const, date: new Date(t.closingDate!).toISOString(), daysRemaining: days, urgency: getUrgency(days) };
    })
    .sort((a, b) => a.daysRemaining - b.daysRemaining)
    .slice(0, 10);

  res.json(events);
});

export default router;
