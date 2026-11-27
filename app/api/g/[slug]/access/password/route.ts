import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, get, nowIso, ready } from "@/lib/db";
import { accessCookieName, accessCookieOptions, getGalleryBySlug, signAccessToken } from "@/lib/access";
import { sha256, verifyPassword } from "@/lib/password";
import { isExpired } from "@/lib/format";
import { jsonError, readJson, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

const WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILURES = 12;

function clientKey(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || req.headers.get("x-real-ip") || "direct";
}

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return jsonError("Gallery not found", 404);
  if (gallery.access_mode !== "password") return jsonError("This gallery is not password protected.", 400);
  if (gallery.status !== "published" || gallery.revoked_at || isExpired(gallery.expires_at)) {
    return jsonError("This gallery link is no longer active.", 410);
  }
  if (!gallery.password_hash) return jsonError("The studio has not set a password yet.", 409);

  const client = sha256(`${gallery.id}:${clientKey(req)}`);
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  db.prepare("DELETE FROM access_attempts WHERE gallery_id = ? AND kind = 'password' AND created_at < ?").run(gallery.id, since);
  const failures = get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM access_attempts WHERE gallery_id = ? AND kind = 'password' AND client = ? AND created_at > ?",
    gallery.id,
    client,
    since,
  )?.count;
  if (Number(failures) >= MAX_FAILURES) {
    return jsonError("Too many attempts. Wait a few minutes and try again.", 429);
  }

  const body = await readJson<{ password?: string }>(req);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!password) return jsonError("Enter the gallery password.", 400);
  if (!verifyPassword(password, gallery.password_hash)) {
    db.prepare("INSERT INTO access_attempts (id, gallery_id, kind, client, created_at) VALUES (?, ?, 'password', ?, ?)").run(
      randomUUID(),
      gallery.id,
      client,
      nowIso(),
    );
    return jsonError("That password is not correct.", 401);
  }

  db.prepare("DELETE FROM access_attempts WHERE gallery_id = ? AND kind = 'password' AND client = ?").run(gallery.id, client);

  const res = NextResponse.json({ ok: true });
  res.cookies.set({
    name: accessCookieName(gallery.id),
    value: signAccessToken(gallery.id, "gallery-password", gallery.link_version),
    ...accessCookieOptions(),
  });
  return res;
}
