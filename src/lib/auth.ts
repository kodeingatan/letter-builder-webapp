import "server-only";
import crypto from "node:crypto";
import { cookies } from "next/headers";
import { getDb, nowIso } from "@/lib/db";

export { hashPassword, verifyPassword } from "@/lib/password";

export const SESSION_COOKIE = "lb_session";
const SESSION_DAYS = 14;

export type UserRole = "admin" | "operator";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export async function startSession(userId: string): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  getDb()
    .prepare(
      "INSERT INTO sessions (token_hash, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
    )
    .run(hashToken(token), userId, expires.toISOString(), nowIso());

  const store = await cookies();
  store.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });

  return token;
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (token) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }
  store.delete(SESSION_COOKIE);
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const row = getDb()
    .prepare(
      `SELECT u.id, u.name, u.email, u.role
       FROM sessions s
       JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = ? AND s.expires_at > ?`,
    )
    .get(hashToken(token), nowIso()) as AuthUser | undefined;

  return row ?? null;
}

export async function clearExpiredSessions(): Promise<void> {
  getDb().prepare("DELETE FROM sessions WHERE expires_at <= ?").run(nowIso());
}
