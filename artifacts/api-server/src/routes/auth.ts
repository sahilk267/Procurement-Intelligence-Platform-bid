import { Router } from "express";
import { db } from "@workspace/db";
import { tenantsTable, usersTable } from "@workspace/db";
import { hashPassword, verifyPassword, generateToken } from "../lib/auth";
import { authenticate, type AuthenticatedRequest } from "../middlewares/authenticate";
import { eq } from "drizzle-orm";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password required" });
    return;
  }
  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (!user || !verifyPassword(password, user.passwordHash)) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = generateToken(user.id, user.tenantId);
  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
  });
});

router.post("/register", async (req, res) => {
  const { email, password, name, companyName } = req.body;
  if (!email || !password || !name) {
    res.status(400).json({ error: "Email, password, and name required" });
    return;
  }
  const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, email.toLowerCase())).limit(1);
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }
  const [tenant] = await db.insert(tenantsTable).values({
    name: companyName || name + "'s Company",
    slug: (companyName || name).toLowerCase().replace(/\s+/g, "-") + "-" + Date.now(),
  }).returning();
  const [user] = await db.insert(usersTable).values({
    tenantId: tenant.id,
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    role: "company_owner",
  }).returning();
  const token = generateToken(user.id, user.tenantId);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId },
  });
});

router.get("/me", authenticate, async (req: AuthenticatedRequest, res) => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!)).limit(1);
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenantId, createdAt: user.createdAt });
});

export default router;
