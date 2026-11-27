import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, get, nowIso, ready, transaction } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { clientIp, jsonError, normalizeEmail, readJson, safeText, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

const SIGNUP_WINDOW_MS = 60 * 60 * 1000;
const MAX_EMAIL_ATTEMPTS = 5;
const MAX_CLIENT_ATTEMPTS = 10;
const STORAGE_LIMIT_BYTES = 5 * 1024 ** 3;

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  if (process.env.NURAX_SIGNUPS_ENABLED === "0") {
    return jsonError("Studio sign-up is currently closed. Request an invitation from NURA-X.", 403);
  }

  await ready();
  const body = await readJson<{ name?: string; email?: string; password?: string }>(req);
  const name = safeText(body?.name, 90);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!name) return jsonError("Enter your name or studio name.", 400);
  if (!email) return jsonError("Enter a valid email address.", 400);
  if (password.length < 12 || password.length > 128) {
    return jsonError("Choose a password between 12 and 128 characters.", 400);
  }

  const now = nowIso();
  const since = new Date(Date.now() - SIGNUP_WINDOW_MS).toISOString();
  const client = clientIp(req).slice(0, 100);
  const emailAttempts = get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM signup_attempts WHERE email = ? AND created_at >= ?",
    email,
    since,
  )?.count ?? 0;
  const clientAttempts = get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM signup_attempts WHERE client = ? AND created_at >= ?",
    client,
    since,
  )?.count ?? 0;
  if (emailAttempts >= MAX_EMAIL_ATTEMPTS || clientAttempts >= MAX_CLIENT_ATTEMPTS) {
    return jsonError("Too many sign-up attempts. Please try again later.", 429);
  }

  const passwordHash = hashPassword(password);
  const session = createSessionToken();
  const result = transaction(() => {
    db.prepare("DELETE FROM signup_attempts WHERE created_at < ?").run(since);
    const emailAttempts = get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM signup_attempts WHERE email = ? AND created_at >= ?",
      email,
      since,
    )?.count ?? 0;
    const clientAttempts = get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM signup_attempts WHERE client = ? AND created_at >= ?",
      client,
      since,
    )?.count ?? 0;
    if (emailAttempts >= MAX_EMAIL_ATTEMPTS || clientAttempts >= MAX_CLIENT_ATTEMPTS) {
      return "rate_limited" as const;
    }

    db.prepare("INSERT INTO signup_attempts (email, client, created_at) VALUES (?, ?, ?)").run(email, client, now);
    if (get("SELECT id FROM users WHERE email = ? COLLATE NOCASE", email)) return "exists" as const;

    const userId = randomUUID();
    db.prepare(
      `INSERT INTO users (id, email, name, role, password_hash, status, storage_limit_bytes, created_at)
       VALUES (?, ?, ?, 'studio', ?, 'active', ?, ?)`,
    ).run(userId, email, name, passwordHash, STORAGE_LIMIT_BYTES, now);
    db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
      session.token,
      userId,
      session.expiresAt,
      now,
    );
    return "created" as const;
  });

  if (result === "rate_limited") {
    return jsonError("Too many sign-up attempts. Please try again later.", 429);
  }
  if (result === "exists") {
    return jsonError("This email may already have an account. Try signing in or use another email.", 409);
  }

  const res = NextResponse.json({ ok: true, role: "studio", name });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: session.token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
