import { Router } from "express";
import { db } from "@workspace/db";
import { tendersTable, documentsTable, bidsTable, usersTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, lte, gte, sql, count } from "drizzle-orm";
import { testEmailConnection } from "../lib/notifications";

const router = Router();
router.use(authenticate);

interface Notification {
  id: string;
  type: "tender_deadline" | "document_expiry" | "document_expired" | "stale_bid";
  severity: "urgent" | "warning" | "info";
  title: string;
  message: string;
  date: string | null;
  entityId: number;
  entityType: "tender" | "document" | "bid";
  link: string;
}

router.get("/", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const now = new Date();
  const notifications: Notification[] = [];

  // ── 1. Tenders closing in the next 7 days ─────────────────────────────────
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const urgentTenders = await db
    .select({
      id: tendersTable.id,
      title: tendersTable.title,
      closingDate: tendersTable.closingDate,
      status: tendersTable.status,
    })
    .from(tendersTable)
    .where(
      and(
        eq(tendersTable.tenantId, tenantId),
        eq(tendersTable.status, "open"),
        lte(tendersTable.closingDate, in7Days.toISOString().split("T")[0]),
        gte(tendersTable.closingDate, now.toISOString().split("T")[0])
      )
    );

  urgentTenders.forEach(t => {
    const closing = new Date(t.closingDate!);
    const daysLeft = Math.ceil((closing.getTime() - now.getTime()) / 86400000);
    notifications.push({
      id: `tender-${t.id}`,
      type: "tender_deadline",
      severity: daysLeft <= 2 ? "urgent" : daysLeft <= 5 ? "warning" : "info",
      title: "Tender Closing Soon",
      message: `"${t.title}" closes in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
      date: t.closingDate,
      entityId: t.id,
      entityType: "tender",
      link: "/tenders",
    });
  });

  // ── 2. Expired documents ───────────────────────────────────────────────────
  const allDocs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.tenantId, tenantId));

  allDocs.forEach(doc => {
    if (!doc.expiryDate) return;
    const expiry = new Date(doc.expiryDate);
    const msLeft = expiry.getTime() - now.getTime();
    const daysLeft = Math.ceil(msLeft / 86400000);

    if (daysLeft < 0) {
      notifications.push({
        id: `doc-expired-${doc.id}`,
        type: "document_expired",
        severity: "urgent",
        title: "Document Expired",
        message: `"${doc.name}" expired ${Math.abs(daysLeft)} day${Math.abs(daysLeft) !== 1 ? "s" : ""} ago`,
        date: doc.expiryDate,
        entityId: doc.id,
        entityType: "document",
        link: "/documents",
      });
    } else if (daysLeft <= 30) {
      notifications.push({
        id: `doc-expiring-${doc.id}`,
        type: "document_expiry",
        severity: daysLeft <= 7 ? "urgent" : daysLeft <= 14 ? "warning" : "info",
        title: "Document Expiring Soon",
        message: `"${doc.name}" expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`,
        date: doc.expiryDate,
        entityId: doc.id,
        entityType: "document",
        link: "/documents",
      });
    }
  });

  // ── 3. Stale bids (no update in 14+ days, not in terminal stage) ──────────
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const allBids = await db
    .select({
      id: bidsTable.id,
      stage: bidsTable.stage,
      updatedAt: bidsTable.updatedAt,
      tenderId: bidsTable.tenderId,
    })
    .from(bidsTable)
    .where(eq(bidsTable.tenantId, tenantId));

  const terminalStages = ["won", "lost", "no_bid"];
  const staleBids = allBids.filter(b => {
    if (terminalStages.includes(b.stage)) return false;
    const updated = new Date(b.updatedAt!);
    return updated < twoWeeksAgo;
  });

  // Fetch tender names for stale bids
  if (staleBids.length > 0) {
    const tenderIds = [...new Set(staleBids.map(b => b.tenderId))];
    const tenders = await db
      .select({ id: tendersTable.id, title: tendersTable.title })
      .from(tendersTable)
      .where(eq(tendersTable.tenantId, tenantId));
    const tenderMap = Object.fromEntries(tenders.map(t => [t.id, t.title]));

    staleBids.forEach(b => {
      const daysStale = Math.floor((now.getTime() - new Date(b.updatedAt!).getTime()) / 86400000);
      const stageLabel: Record<string, string> = {
        identification: "Identification",
        evaluation: "Evaluation",
        bid_prep: "Bid Prep",
        submitted: "Submitted",
      };
      notifications.push({
        id: `stale-bid-${b.id}`,
        type: "stale_bid",
        severity: daysStale >= 21 ? "warning" : "info",
        title: "Bid Needs Attention",
        message: `Bid for "${tenderMap[b.tenderId] || `Tender #${b.tenderId}`}" stuck in ${stageLabel[b.stage] || b.stage} for ${daysStale} days`,
        date: b.updatedAt ? b.updatedAt.toISOString() : null,
        entityId: b.id,
        entityType: "bid",
        link: "/bids",
      });
    });
  }

  // Sort: urgent first, then by date
  const severityOrder = { urgent: 0, warning: 1, info: 2 };
  notifications.sort((a, b) => {
    const sv = severityOrder[a.severity] - severityOrder[b.severity];
    if (sv !== 0) return sv;
    if (a.date && b.date) return new Date(a.date).getTime() - new Date(b.date).getTime();
    return 0;
  });

  const urgent = notifications.filter(n => n.severity === "urgent").length;
  const warning = notifications.filter(n => n.severity === "warning").length;

  res.json({
    data: notifications,
    total: notifications.length,
    unread: urgent + warning,
    counts: { urgent, warning, info: notifications.length - urgent - warning },
  });
});

// EMAIL NOTIFICATION MANAGEMENT

// Test email configuration
router.get("/email/test", async (req: AuthenticatedRequest, res) => {
  try {
    // Only allow admin users to test email
    if (req.user?.role !== 'admin') {
      return res.status(403).json({ error: "Admin access required" });
    }

    const isConnected = await testEmailConnection();
    res.json({
      emailConfigured: isConnected,
      smtpHost: process.env.SMTP_HOST || 'localhost',
      smtpPort: process.env.SMTP_PORT || '1025'
    });
  } catch (error) {
    console.error("Error testing email:", error);
    res.status(500).json({ error: "Failed to test email configuration" });
  }
});

// Get user's notification preferences
router.get("/preferences", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;

    // For now, return default preferences
    // In a real implementation, you'd have a notification_preferences table
    const preferences = {
      emailNotifications: true,
      tenderAlerts: true,
      bidUpdates: true,
      taskAssignments: true,
      documentExpiry: true,
      frequency: 'immediate' // immediate, daily, weekly
    };

    res.json(preferences);
  } catch (error) {
    console.error("Error fetching notification preferences:", error);
    res.status(500).json({ error: "Failed to fetch preferences" });
  }
});

// Update user's notification preferences
router.put("/preferences", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { emailNotifications, tenderAlerts, bidUpdates, taskAssignments, documentExpiry, frequency } = req.body;

    // For now, just validate and return success
    // In a real implementation, you'd save to a notification_preferences table
    const preferences = {
      emailNotifications: emailNotifications ?? true,
      tenderAlerts: tenderAlerts ?? true,
      bidUpdates: bidUpdates ?? true,
      taskAssignments: taskAssignments ?? true,
      documentExpiry: documentExpiry ?? true,
      frequency: frequency ?? 'immediate'
    };

    // Log preference update
    await db.insert(activityLogsTable).values({
      tenantId,
      userId,
      type: "notification_preferences_updated",
      entityType: "user",
      entityId: userId,
      entityName: req.user!.name,
      description: `Notification preferences updated`
    });

    res.json({ success: true, preferences });
  } catch (error) {
    console.error("Error updating notification preferences:", error);
    res.status(500).json({ error: "Failed to update preferences" });
  }
});

// Get recent notifications (activity logs that would trigger notifications)
router.get("/recent", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    // Get recent activity logs that would trigger notifications
    const notificationTypes = [
      'tender_created',
      'bid_created',
      'bid_stage_changed',
      'task_created',
      'document_uploaded',
      'alert_created'
    ];

    const [logs, totalResult] = await Promise.all([
      db.select()
        .from(activityLogsTable)
        .where(and(
          eq(activityLogsTable.tenantId, tenantId),
          sql`${activityLogsTable.type} IN ${notificationTypes}`
        ))
        .orderBy(sql`created_at DESC`)
        .limit(limit)
        .offset(offset),
      db.select({ count: count() })
        .from(activityLogsTable)
        .where(and(
          eq(activityLogsTable.tenantId, tenantId),
          sql`${activityLogsTable.type} IN ${notificationTypes}`
        ))
    ]);

    res.json({
      data: logs,
      total: totalResult[0].count,
      page,
      limit
    });
  } catch (error) {
    console.error("Error fetching recent notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
});

export default router;
