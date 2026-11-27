import { randomUUID } from "node:crypto";
import { db, nowIso, ready, get } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/password";
import { jsonError, jsonOk, normalizeEmail, readJson, safeText, sameOrigin } from "@/lib/http";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return jsonError("Not authorised", 403);

  const body = await readJson<{ name?: string; email?: string; storageGb?: number }>(req);
  const name = safeText(body?.name, 90);
  const email = normalizeEmail(body?.email);
  const storageGb = Number(body?.storageGb ?? 50);
  if (!name) return jsonError("Add the studio's name.", 400);
  if (!email) return jsonError("Add a valid email address.", 400);
  if (!Number.isFinite(storageGb) || storageGb < 1 || storageGb > 1000) {
    return jsonError("Storage limit must be between 1 and 1000 GB.", 400);
  }

  const existing = get<UserRow>("SELECT * FROM users WHERE email = ? COLLATE NOCASE", email);
  if (existing) return jsonError("A studio with that email already exists.", 409);

  const id = randomUUID();
  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, status, storage_limit_bytes, invite_token, invite_expires_at, created_at)
     VALUES (?, ?, ?, 'studio', NULL, 'invited', ?, ?, ?, ?)`,
  ).run(id, email, name, Math.round(storageGb * 1024 ** 3), token, expiresAt, nowIso());

  return jsonOk({ id, invitePath: `/invite/${token}`, email, expiresAt });
}
