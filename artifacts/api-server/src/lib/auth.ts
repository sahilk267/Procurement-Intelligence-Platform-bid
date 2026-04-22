import { createHash, randomBytes } from "crypto";

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = createHash("sha256").update(password + salt).digest("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  const computed = createHash("sha256").update(password + salt).digest("hex");
  return computed === hash;
}

export function generateToken(userId: number, tenantId: number): string {
  const payload = JSON.stringify({ userId, tenantId, exp: Date.now() + 7 * 24 * 60 * 60 * 1000 });
  return Buffer.from(payload).toString("base64url");
}

export function verifyToken(token: string): { userId: number; tenantId: number } | null {
  try {
    const payload = JSON.parse(Buffer.from(token, "base64url").toString());
    if (payload.exp < Date.now()) return null;
    return { userId: payload.userId, tenantId: payload.tenantId };
  } catch {
    return null;
  }
}
