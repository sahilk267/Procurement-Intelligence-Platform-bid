import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, tenantsTable, activityLogsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq, desc, count, sql } from "drizzle-orm";

const router = Router();
router.use(authenticate);

// Admin role validation middleware
const requireAdmin = (req: AuthenticatedRequest, res: any, next: any) => {
  if (req.user?.role !== 'admin') {
    return res.status(403).json({ error: "Admin access required" });
  }
  next();
};

// Apply admin middleware to all routes
router.use(requireAdmin);

// User Management
router.get("/users", async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const q = req.query.q as string;
    const role = req.query.role as string;

    let whereConditions = [eq(usersTable.tenantId, req.user!.tenantId)];

    if (q) {
      whereConditions.push(sql`${usersTable.email} ILIKE ${`%${q}%`} OR ${usersTable.name} ILIKE ${`%${q}%`}`);
    }

    if (role) {
      whereConditions.push(eq(usersTable.role, role));
    }

    const [users, totalResult] = await Promise.all([
      db.select().from(usersTable).where(sql.join(whereConditions, sql` AND `)).limit(limit).offset(offset).orderBy(desc(usersTable.createdAt)),
      db.select({ count: count() }).from(usersTable).where(sql.join(whereConditions, sql` AND `))
    ]);

    res.json({
      data: users,
      total: totalResult[0].count,
      page,
      limit
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

router.post("/users", async (req: AuthenticatedRequest, res) => {
  try {
    const { email, name, password, role = "viewer" } = req.body;

    if (!email || !name || !password) {
      return res.status(400).json({ error: "Email, name, and password are required" });
    }

    if (!["admin", "manager", "user", "viewer"].includes(role)) {
      return res.status(400).json({ error: "Invalid role. Must be admin, manager, user, or viewer" });
    }

    // Check if email already exists
    const existingUser = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
    if (existingUser.length > 0) {
      return res.status(400).json({ error: "Email already exists" });
    }

    const newUser = await db.insert(usersTable).values({
      tenantId: req.user!.tenantId,
      email,
      name,
      passwordHash: password, // In production, hash this password
      role,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    }).returning();

    // Log activity
    await db.insert(activityLogsTable).values({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      type: "user_created",
      entityType: "user",
      entityId: newUser[0].id,
      entityName: name,
      description: `User ${name} created by admin ${req.user!.name}`
    });

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: "Failed to create user" });
  }
});

router.put("/users/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, role, isActive } = req.body;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Check if user exists and belongs to tenant
    const existingUser = await db.select().from(usersTable)
      .where(sql`${usersTable.id} = ${userId} AND ${usersTable.tenantId} = ${req.user!.tenantId}`)
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const updateData: any = {
      updatedBy: req.user!.id,
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (role !== undefined) {
      if (!["admin", "manager", "user", "viewer"].includes(role)) {
        return res.status(400).json({ error: "Invalid role" });
      }
      updateData.role = role;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedUser = await db.update(usersTable)
      .set(updateData)
      .where(sql`${usersTable.id} = ${userId} AND ${usersTable.tenantId} = ${req.user!.tenantId}`)
      .returning();

    // Log activity
    await db.insert(activityLogsTable).values({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      type: "user_updated",
      entityType: "user",
      entityId: userId,
      entityName: existingUser[0].name,
      description: `User ${existingUser[0].name} updated by admin ${req.user!.name}`
    });

    res.json(updatedUser[0]);
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Failed to update user" });
  }
});

router.delete("/users/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const userId = parseInt(req.params.id);

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Prevent deleting self
    if (userId === req.user!.id) {
      return res.status(400).json({ error: "Cannot delete your own account" });
    }

    // Check if user exists and belongs to tenant
    const existingUser = await db.select().from(usersTable)
      .where(sql`${usersTable.id} = ${userId} AND ${usersTable.tenantId} = ${req.user!.tenantId}`)
      .limit(1);

    if (existingUser.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    await db.delete(usersTable)
      .where(sql`${usersTable.id} = ${userId} AND ${usersTable.tenantId} = ${req.user!.tenantId}`);

    // Log activity
    await db.insert(activityLogsTable).values({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      type: "user_deleted",
      entityType: "user",
      entityId: userId,
      entityName: existingUser[0].name,
      description: `User ${existingUser[0].name} deleted by admin ${req.user!.name}`
    });

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ error: "Failed to delete user" });
  }
});

// Tenant Management (Super Admin only - for now, restrict to admin role)
router.get("/tenants", async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = (page - 1) * limit;

    const q = req.query.q as string;

    let whereConditions = [];

    if (q) {
      whereConditions.push(sql`${tenantsTable.name} ILIKE ${`%${q}%`} OR ${tenantsTable.domain} ILIKE ${`%${q}%`}`);
    }

    const [tenants, totalResult] = await Promise.all([
      db.select().from(tenantsTable).where(sql.join(whereConditions, sql` AND `)).limit(limit).offset(offset).orderBy(desc(tenantsTable.createdAt)),
      db.select({ count: count() }).from(tenantsTable).where(sql.join(whereConditions, sql` AND `))
    ]);

    res.json({
      data: tenants,
      total: totalResult[0].count,
      page,
      limit
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    res.status(500).json({ error: "Failed to fetch tenants" });
  }
});

router.post("/tenants", async (req: AuthenticatedRequest, res) => {
  try {
    const { name, domain, isActive = true } = req.body;

    if (!name || !domain) {
      return res.status(400).json({ error: "Name and domain are required" });
    }

    // Check if domain already exists
    const existingTenant = await db.select().from(tenantsTable).where(eq(tenantsTable.domain, domain)).limit(1);
    if (existingTenant.length > 0) {
      return res.status(400).json({ error: "Domain already exists" });
    }

    const newTenant = await db.insert(tenantsTable).values({
      name,
      domain,
      isActive,
      createdBy: req.user!.id,
      updatedBy: req.user!.id
    }).returning();

    // Log activity
    await db.insert(activityLogsTable).values({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      type: "tenant_created",
      entityType: "tenant",
      entityId: newTenant[0].id,
      entityName: name,
      description: `Tenant ${name} created by admin ${req.user!.name}`
    });

    res.status(201).json(newTenant[0]);
  } catch (error) {
    console.error("Error creating tenant:", error);
    res.status(500).json({ error: "Failed to create tenant" });
  }
});

router.put("/tenants/:id", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = parseInt(req.params.id);
    const { name, domain, isActive } = req.body;

    if (!tenantId) {
      return res.status(400).json({ error: "Tenant ID is required" });
    }

    // Check if tenant exists
    const existingTenant = await db.select().from(tenantsTable).where(eq(tenantsTable.id, tenantId)).limit(1);
    if (existingTenant.length === 0) {
      return res.status(404).json({ error: "Tenant not found" });
    }

    const updateData: any = {
      updatedBy: req.user!.id,
      updatedAt: new Date()
    };

    if (name !== undefined) updateData.name = name;
    if (domain !== undefined) {
      // Check if new domain conflicts
      const domainCheck = await db.select().from(tenantsTable)
        .where(sql`${tenantsTable.domain} = ${domain} AND ${tenantsTable.id} != ${tenantId}`)
        .limit(1);
      if (domainCheck.length > 0) {
        return res.status(400).json({ error: "Domain already exists" });
      }
      updateData.domain = domain;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updatedTenant = await db.update(tenantsTable)
      .set(updateData)
      .where(eq(tenantsTable.id, tenantId))
      .returning();

    // Log activity
    await db.insert(activityLogsTable).values({
      tenantId: req.user!.tenantId,
      userId: req.user!.id,
      type: "tenant_updated",
      entityType: "tenant",
      entityId: tenantId,
      entityName: existingTenant[0].name,
      description: `Tenant ${existingTenant[0].name} updated by admin ${req.user!.name}`
    });

    res.json(updatedTenant[0]);
  } catch (error) {
    console.error("Error updating tenant:", error);
    res.status(500).json({ error: "Failed to update tenant" });
  }
});

// Admin Analytics
router.get("/analytics", async (req: AuthenticatedRequest, res) => {
  try {
    const tenantId = req.user!.tenantId;

    // Get user statistics
    const [userStats] = await db.select({
      totalUsers: count(),
      activeUsers: sql<number>`count(case when ${usersTable.isActive} = true then 1 end)`,
      adminUsers: sql<number>`count(case when ${usersTable.role} = 'admin' then 1 end)`,
      managerUsers: sql<number>`count(case when ${usersTable.role} = 'manager' then 1 end)`
    }).from(usersTable).where(eq(usersTable.tenantId, tenantId));

    // Get recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [activityStats] = await db.select({
      totalActivities: count(),
      userCreations: sql<number>`count(case when ${activityLogsTable.type} = 'user_created' then 1 end)`,
      bidActivities: sql<number>`count(case when ${activityLogsTable.entityType} = 'bid' then 1 end)`,
      tenderActivities: sql<number>`count(case when ${activityLogsTable.entityType} = 'tender' then 1 end)`
    }).from(activityLogsTable)
      .where(sql`${activityLogsTable.tenantId} = ${tenantId} AND ${activityLogsTable.createdAt} >= ${thirtyDaysAgo}`);

    // Get system health metrics (simplified)
    const systemHealth = {
      databaseStatus: "healthy",
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage()
    };

    res.json({
      userStats,
      activityStats,
      systemHealth,
      generatedAt: new Date().toISOString()
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    res.status(500).json({ error: "Failed to fetch analytics" });
  }
});

// Audit Logs for Admin
router.get("/audit-logs", async (req: AuthenticatedRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = (page - 1) * limit;

    const entityType = req.query.entityType as string;
    const type = req.query.type as string;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : null;

    let whereConditions = [eq(activityLogsTable.tenantId, req.user!.tenantId)];

    if (entityType) {
      whereConditions.push(eq(activityLogsTable.entityType, entityType));
    }

    if (type) {
      whereConditions.push(eq(activityLogsTable.type, type));
    }

    if (userId) {
      whereConditions.push(eq(activityLogsTable.userId, userId));
    }

    const [logs, totalResult] = await Promise.all([
      db.select().from(activityLogsTable)
        .where(sql.join(whereConditions, sql` AND `))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(activityLogsTable.createdAt)),
      db.select({ count: count() }).from(activityLogsTable)
        .where(sql.join(whereConditions, sql` AND `))
    ]);

    res.json({
      data: logs,
      total: totalResult[0].count,
      page,
      limit
    });
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ error: "Failed to fetch audit logs" });
  }
});

export default router;
