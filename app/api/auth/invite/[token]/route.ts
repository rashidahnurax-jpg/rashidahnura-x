import { NextResponse } from "next/server";
import { db, nowIso, ready, get } from "@/lib/db";
import { createSessionToken, SESSION_COOKIE } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { jsonError, readJson, sameOrigin, safeText } from "@/lib/http";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ token: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const { token } = await params;
  const body = await readJson<{ name?: string; password?: string }>(req);
  const password = typeof body?.password === "string" ? body.password : "";
  const name = safeText(body?.name, 90);

  if (password.length < 8) return jsonError("Choose a password with at least 8 characters.", 400);

  const user = get<UserRow>(
    "SELECT * FROM users WHERE invite_token = ? AND status = 'invited' AND role = 'studio'",
    token,
  );
  if (!user) return jsonError("This invitation is no longer valid.", 404);
  if (user.invite_expires_at && new Date(user.invite_expires_at).getTime() < Date.now()) {
    return jsonError("This invitation has expired. Ask NURA-X to send a new one.", 410);
  }

  db.prepare(
    "UPDATE users SET name = ?, password_hash = ?, status = 'active', invite_token = NULL, invite_expires_at = NULL WHERE id = ?",
  ).run(name || user.name, hashPassword(password), user.id);

  const session = createSessionToken();
  db.prepare("INSERT INTO sessions (token, user_id, expires_at, created_at) VALUES (?, ?, ?, ?)").run(
    session.token,
    user.id,
    session.expiresAt,
    nowIso(),
  );

  const res = NextResponse.json({ ok: true });
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
