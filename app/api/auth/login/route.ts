import { NextResponse } from "next/server";
import { db, nowIso, ready } from "@/lib/db";
import { authenticate, createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { jsonError, readJson, sameOrigin, normalizeEmail } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const body = await readJson<{ email?: string; password?: string }>(req);
  const email = normalizeEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return jsonError("Enter your email and password.", 400);

  const user = authenticate(email, password);
  if (!user) return jsonError("Those credentials do not match an active account.", 401);

  const { token, expiresAt } = createSessionToken();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    token,
    user.id,
    expiresAt,
    nowIso(),
  );
  db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(nowIso(), user.id);

  const res = NextResponse.json({ ok: true, role: user.role, name: user.name });
  res.cookies.set({
    name: SESSION_COOKIE,
    value: token,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 30 * 24 * 60 * 60,
  });
  return res;
}
