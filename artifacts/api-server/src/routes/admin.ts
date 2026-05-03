import { Router } from "express";
import { db } from "@workspace/db";
import { usersTable, tenantsTable } from "@workspace/db";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { hashPassword } from "../lib/auth";
import { eq, desc } from "drizzle-orm";

const router = Router();
router.use(authenticate);

// Middleware: only company_owner or admin roles can access
router.use((req: AuthenticatedRequest, res, next) => {
  // For now any authenticated user can view — future: restrict to admin roles
  next();
});

// GET /api/admin/users — list all users in the tenant
router.get("/users", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const users = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    })
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId))
    .orderBy(desc(usersTable.createdAt));
  res.json(users);
});

// POST /api/admin/users — create a new user in the tenant
router.post("/users", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    res.status(400).json({ error: "name, email, and password are required" });
    return;
  }

  const existing = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, email.toLowerCase()))
    .limit(1);

  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const [user] = await db
    .insert(usersTable)
    .values({
      tenantId,
      name,
      email: email.toLowerCase(),
      passwordHash: hashPassword(password),
      role: role || "viewer",
    })
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
      createdAt: usersTable.createdAt,
    });

  res.status(201).json(user);
});

// PUT /api/admin/users/:id — update user role
router.put("/users/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const { role, name } = req.body;

  const [user] = await db
    .update(usersTable)
    .set({ ...(role ? { role } : {}), ...(name ? { name } : {}), updatedAt: new Date() })
    .where(eq(usersTable.id, id))
    .returning({
      id: usersTable.id,
      name: usersTable.name,
      email: usersTable.email,
      role: usersTable.role,
    });

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json(user);
});

// DELETE /api/admin/users/:id — delete user
router.delete("/users/:id", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const id = parseInt(req.params.id);
  const reqUserId = req.userId!;

  if (id === reqUserId) {
    res.status(400).json({ error: "Cannot delete your own account" });
    return;
  }

  await db.delete(usersTable).where(eq(usersTable.id, id));
  res.status(204).send();
});

// GET /api/admin/system — system overview stats
router.get("/system", async (req: AuthenticatedRequest, res) => {
  const tenantId = req.tenantId!;
  const users = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId));

  res.json({
    totalUsers: users.length,
    platform: "ProcureIntel v1.0",
    status: "healthy",
  });
});

export default router;
