import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../lib/auth";

export interface AuthenticatedRequest extends Request {
  userId?: number;
  tenantId?: number;
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid or expired token" });
    return;
  }
  req.userId = payload.userId;
  req.tenantId = payload.tenantId;
  next();
}
