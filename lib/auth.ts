import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, get, ready } from "./db";
import type { UserRow } from "./types";
import { randomToken, hashPassword, verifyPassword } from "./password";

export const SESSION_COOKIE = "nx_session";
const SESSION_DAYS = 30;

export function sessionExpiry(days = SESSION_DAYS): Date {
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

export function createSessionToken(): { token: string; expiresAt: string } {
  return { token: randomToken(32), expiresAt: sessionExpiry().toISOString() };
}

export async function getCurrentUser(): Promise<UserRow | null> {
  await ready();
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const row = get<UserRow & { session_expires_at: string }>(
    `SELECT u.*, s.expires_at AS session_expires_at
     FROM sessions s JOIN users u ON u.id = s.user_id
     WHERE s.token = ?`,
    token,
  );
  if (!row) return null;
  if (new Date(row.session_expires_at).getTime() < Date.now()) return null;
  if (row.status === "suspended") return null;
  return row;
}

export async function requireUser(): Promise<UserRow> {
  const user = await getCurrentUser();
  if (!user) redirect("/signin");
  return user;
}

export async function requireStudio(): Promise<UserRow> {
  const user = await requireUser();
  if (user.role !== "studio") redirect(user.role === "admin" ? "/admin" : "/signin");
  if (user.status === "invited") redirect(`/invite/${user.invite_token}`);
  return user;
}

export async function requireAdmin(): Promise<UserRow> {
  const user = await requireUser();
  if (user.role !== "admin") redirect("/studio");
  return user;
}

export function authenticate(email: string, password: string): UserRow | null {
  const user = get<UserRow>("SELECT * FROM users WHERE email = ? COLLATE NOCASE", email.trim());
  if (!user) return null;
  if (!verifyPassword(password, user.password_hash)) return null;
  if (user.status === "suspended") return null;
  return user;
}

export function setUserPassword(userId: string, password: string): void {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(password), userId);
}
