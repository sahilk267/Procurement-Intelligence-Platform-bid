import { Router } from "express";
import { db } from "@workspace/db";
import { bidsTable, bidTasksTable, tendersTable, boqItemsTable, proposalsTable, activityLogsTable, usersTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, and, desc, count, sum } from "drizzle-orm";
import { sendBidStatusUpdate, sendTaskAssigned } from "../lib/notifications";

const router = Router();
router.use(authenticate);

// GET all bids for tenant
router.get("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { stage = "", status = "", page = "1", limit = "20" } = req.query as Record<string, string>;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const conditions = [eq(bidsTable.tenantId, tenantId)];
    if (stage) conditions.push(eq(bidsTable.stage, stage));

    const [bids, totalResult] = await Promise.all([
      db.select({
        id: bidsTable.id,
        tenderId: bidsTable.tenderId,
        stage: bidsTable.stage,
        targetValue: bidsTable.targetValue,
        submissionDate: bidsTable.submissionDate,
        resultDate: bidsTable.resultDate,
        wonValue: bidsTable.wonValue,
        createdAt: bidsTable.createdAt,
        updatedAt: bidsTable.updatedAt,
        tenderTitle: tendersTable.title,
        authority: tendersTable.authority,
        category: tendersTable.category,
      })
        .from(bidsTable)
        .leftJoin(tendersTable, eq(bidsTable.tenderId, tendersTable.id))
        .where(and(...conditions))
        .orderBy(desc(bidsTable.createdAt))
        .limit(parseInt(limit))
        .offset(offset),
      db.select({ count: count() }).from(bidsTable).where(and(...conditions)),
    ]);

    res.json({ data: bids, total: totalResult[0].count, page: parseInt(page), limit: parseInt(limit) });
  } catch (error) {
    console.error("Error fetching bids:", error);
    res.status(500).json({ error: "Failed to fetch bids" });
  }
});

// CREATE a new bid
router.post("/", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const { tenderId, targetValue, submissionDate, notes = "", stage = "shortlisted" } = req.body;

    if (!tenderId || !targetValue) {
      res.status(400).json({ error: "tenderId and targetValue required" });
      return;
    }

    const [tender] = await db.select().from(tendersTable)
      .where(and(eq(tendersTable.id, tenderId), eq(tendersTable.tenantId, tenantId)))
      .limit(1);

    if (!tender) {
      res.status(404).json({ error: "Tender not found" });
      return;
    }

    const [bid] = await db.insert(bidsTable).values({
      tenantId,
      tenderId,
      createdBy: userId,
      updatedBy: userId,
      stage,
      targetValue: targetValue.toString(),
      submissionDate: submissionDate || null,
      notes: notes || null,
    }).returning();

    // Track the tender automatically
    await db.update(tendersTable)
      .set({ isTracked: true, updatedBy: userId, updatedAt: new Date() })
      .where(eq(tendersTable.id, tenderId));

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "bid_created",
      entityType: "bid",
      entityId: bid.id,
      entityName: tender.title,
      description: `Bid created for ${tender.title}`,
    });

    res.status(201).json({ ...bid, tender });
  } catch (error) {
    console.error("Error creating bid:", error);
    res.status(500).json({ error: "Failed to create bid" });
  }
});

// GET single bid with details
router.get("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid bid ID" });
      return;
    }

    const [bid] = await db.select().from(bidsTable)
      .where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId)))
      .limit(1);

    if (!bid) {
      res.status(404).json({ error: "Bid not found" });
      return;
    }

    const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
    const boqItems = await db.select().from(boqItemsTable).where(eq(boqItemsTable.bidId, id));
    const tasks = await db.select().from(bidTasksTable).where(eq(bidTasksTable.bidId, id));
    const proposals = await db.select().from(proposalsTable).where(eq(proposalsTable.bidId, id));

    const boqTotal = boqItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity.toString());
      const cost = parseFloat(item.unitCost.toString());
      return sum + (qty * cost);
    }, 0);

    res.json({ ...bid, tender, boqItems, boqTotal, tasks, proposals });
  } catch (error) {
    console.error("Error fetching bid:", error);
    res.status(500).json({ error: "Failed to fetch bid" });
  }
});

// UPDATE bid
router.put("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid bid ID" });
      return;
    }

    const [oldBid] = await db.select().from(bidsTable)
      .where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId)))
      .limit(1);

    if (!oldBid) {
      res.status(404).json({ error: "Bid not found" });
      return;
    }

    const updateData: any = { updatedBy: userId, updatedAt: new Date() };
    if (req.body.stage !== undefined) updateData.stage = req.body.stage;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;
    if (req.body.targetValue !== undefined) updateData.targetValue = req.body.targetValue.toString();
    if (req.body.submissionDate !== undefined) updateData.submissionDate = req.body.submissionDate;
    if (req.body.resultDate !== undefined) updateData.resultDate = req.body.resultDate;
    if (req.body.wonValue !== undefined) updateData.wonValue = req.body.wonValue.toString();
    if (req.body.lostReason !== undefined) updateData.lostReason = req.body.lostReason;

    const [bid] = await db.update(bidsTable)
      .set(updateData)
      .where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId)))
      .returning();

    if (req.body.stage && req.body.stage !== oldBid.stage) {
      const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
      await db.insert(activityLogsTable).values({
        tenantId,
        type: "bid_stage_changed",
        entityType: "bid",
        entityId: bid.id,
        entityName: tender?.title || "Tender",
        description: `Bid moved to ${bid.stage}`,
      });

      // Send notification for stage change
      const [user] = await db.select({
        email: usersTable.email,
        name: usersTable.name
      }).from(usersTable)
        .where(eq(usersTable.id, userId))
        .limit(1);

      if (user && user.email) {
        await sendBidStatusUpdate({
          userEmail: user.email,
          userName: user.name,
          bidTitle: tender?.title || "Tender",
          bidId: bid.id,
          oldStatus: oldBid.stage,
          newStatus: bid.stage,
          tenderTitle: tender?.title || "Tender",
          updatedBy: user.name
        });
      }
    }

    const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);
    res.json({ ...bid, tender });
  } catch (error) {
    console.error("Error updating bid:", error);
    res.status(500).json({ error: "Failed to update bid" });
  }
});

// DELETE bid
router.delete("/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid bid ID" });
      return;
    }

    const [bid] = await db.select().from(bidsTable)
      .where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId)))
      .limit(1);

    if (!bid) {
      res.status(404).json({ error: "Bid not found" });
      return;
    }

    // Delete related items
    await db.delete(boqItemsTable).where(eq(boqItemsTable.bidId, id));
    await db.delete(proposalsTable).where(eq(proposalsTable.bidId, id));
    await db.delete(bidTasksTable).where(eq(bidTasksTable.bidId, id));
    await db.delete(bidsTable).where(eq(bidsTable.id, id));

    const [tender] = await db.select().from(tendersTable).where(eq(tendersTable.id, bid.tenderId)).limit(1);

    await db.insert(activityLogsTable).values({
      tenantId,
      type: "bid_deleted",
      entityType: "bid",
      entityId: id,
      entityName: tender?.title || "Tender",
      description: `Bid deleted for ${tender?.title}`,
    });

    res.json({ success: true, message: "Bid deleted" });
  } catch (error) {
    console.error("Error deleting bid:", error);
    res.status(500).json({ error: "Failed to delete bid" });
  }
});

// GET bid tasks
router.get("/:id/tasks", async (req: AuthenticatedRequest, res) => {
  try {
    const id = Number(req.params.id);

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid bid ID" });
      return;
    }

    const tasks = await db.select().from(bidTasksTable)
      .where(eq(bidTasksTable.bidId, id))
      .orderBy(bidTasksTable.id);

    res.json(tasks);
  } catch (error) {
    console.error("Error fetching bid tasks:", error);
    res.status(500).json({ error: "Failed to fetch bid tasks" });
  }
});

// CREATE bid task
router.post("/:id/tasks", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const userId = req.userId!;
    const id = Number(req.params.id);
    const { title, description = "", assignedRole = "", dueDate = null } = req.body;

    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid bid ID" });
      return;
    }

    if (!title) {
      res.status(400).json({ error: "title required" });
      return;
    }

    const [task] = await db.insert(bidTasksTable).values({
      bidId: id,
      title,
      description: description || null,
      assignedRole: assignedRole || null,
      dueDate: dueDate || null,
      status: "pending",
    }).returning();

    // Send notification if assigned to someone
    if (assignedRole) {
      // Get bid and tender info for notification
      const [bid] = await db.select().from(bidsTable)
        .where(and(eq(bidsTable.id, id), eq(bidsTable.tenantId, tenantId)))
        .limit(1);

      if (bid) {
        const [tender] = await db.select().from(tendersTable)
          .where(eq(tendersTable.id, bid.tenderId))
          .limit(1);

        // Get user who assigned the task
        const [assigner] = await db.select({
          name: usersTable.name
        }).from(usersTable)
          .where(eq(usersTable.id, userId))
          .limit(1);

        // Find users with the assigned role to notify
        const assignedUsers = await db.select({
          email: usersTable.email,
          name: usersTable.name
        }).from(usersTable)
          .where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.role, assignedRole)));

        // Send notification to all users with that role
        for (const user of assignedUsers) {
          await sendTaskAssigned({
            userEmail: user.email,
            userName: user.name,
            taskTitle: title,
            bidTitle: tender?.title || "Tender",
            bidId: id,
            assignedBy: assigner?.name || "System",
            dueDate: dueDate
          });
        }
      }
    }

    res.status(201).json(task);
  } catch (error) {
    console.error("Error creating bid task:", error);
    res.status(500).json({ error: "Failed to create bid task" });
  }
});

// UPDATE bid task status
router.put("/:bidId/tasks/:taskId", async (req: AuthenticatedRequest, res) => {
  try {
    const bidId = Number(req.params.bidId);
    const taskId = Number(req.params.taskId);
    const { status = "", completedAt = null } = req.body;

    if (isNaN(bidId) || isNaN(taskId)) {
      res.status(400).json({ error: "Invalid IDs" });
      return;
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (completedAt) updateData.completedAt = completedAt;

    const [task] = await db.update(bidTasksTable)
      .set(updateData)
      .where(and(eq(bidTasksTable.id, taskId), eq(bidTasksTable.bidId, bidId)))
      .returning();

    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }

    res.json(task);
  } catch (error) {
    console.error("Error updating bid task:", error);
    res.status(500).json({ error: "Failed to update bid task" });
  }
});

// COMPARE bids
router.post("/compare/multi", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;
    const { bidIds = [] } = req.body;

    if (bidIds.length === 0) {
      res.status(400).json({ error: "At least one bid ID required" });
      return;
    }

    const bids = await db.select().from(bidsTable)
      .where(and(eq(bidsTable.tenantId, tenantId)))
      .limit(bidIds.length);

    const bidDetails = await Promise.all(
      bids.map(async (bid) => {
        const boqItems = await db.select().from(boqItemsTable)
          .where(eq(boqItemsTable.bidId, bid.id));

        const boqTotal = boqItems.reduce((sum, item) => {
          const qty = parseFloat(item.quantity.toString());
          const cost = parseFloat(item.unitCost.toString());
          const gst = parseFloat(item.gst?.toString() || "0");
          return sum + (qty * cost * (1 + gst / 100));
        }, 0);

        return {
          ...bid,
          boqTotal,
          itemCount: boqItems.length,
          margin: bid.targetValue ? (boqTotal - parseFloat(bid.targetValue.toString())) : 0,
        };
      })
    );

    res.json(bidDetails);
  } catch (error) {
    console.error("Error comparing bids:", error);
    res.status(500).json({ error: "Failed to compare bids" });
  }
});

// GET bid analytics
router.get("/analytics/summary", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.tenantId!;

    const [totalBids] = await db.select({ count: count() })
      .from(bidsTable)
      .where(eq(bidsTable.tenantId, tenantId));

    const [submitted] = await db.select({ count: count() })
      .from(bidsTable)
      .where(and(eq(bidsTable.tenantId, tenantId), eq(bidsTable.stage, "submitted")));

    const [won] = await db.select({ count: count() })
      .from(bidsTable)
      .where(and(eq(bidsTable.tenantId, tenantId), eq(bidsTable.stage, "won")));

    const [totalValue] = await db.select({ total: sum(bidsTable.targetValue) })
      .from(bidsTable)
      .where(eq(bidsTable.tenantId, tenantId));

    const [wonValue] = await db.select({ total: sum(bidsTable.wonValue) })
      .from(bidsTable)
      .where(and(eq(bidsTable.tenantId, tenantId), eq(bidsTable.stage, "won")));

    res.json({
      totalBids: totalBids.count,
      submittedBids: submitted.count,
      wonBids: won.count,
      winRate: totalBids.count > 0 ? ((won.count / totalBids.count) * 100).toFixed(2) : 0,
      totalBidValue: parseFloat(totalValue.total?.toString() || "0"),
      wonValue: parseFloat(wonValue.total?.toString() || "0"),
    });
  } catch (error) {
    console.error("Error fetching bid analytics:", error);
    res.status(500).json({ error: "Failed to fetch bid analytics" });
  }
});

export default router;
