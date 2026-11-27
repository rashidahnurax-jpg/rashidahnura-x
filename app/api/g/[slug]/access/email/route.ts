import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, nowIso, ready } from "@/lib/db";
import { accessCookieName, accessCookieOptions, getGalleryBySlug, signAccessToken } from "@/lib/access";
import { isExpired } from "@/lib/format";
import { jsonError, jsonOk, normalizeEmail, readJson, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return jsonError("Gallery not found", 404);
  if (gallery.access_mode !== "email") return jsonError("This gallery does not use an email gate.", 400);
  if (gallery.status !== "published" || gallery.revoked_at || isExpired(gallery.expires_at)) {
    return jsonError("This gallery link is no longer active.", 410);
  }

  const body = await readJson<{ email?: string }>(req);
  const email = normalizeEmail(body?.email);
  if (!email) return jsonError("Enter a valid email address.", 400);

  db.prepare(
    `INSERT INTO visitors (id, gallery_id, email, verified, created_at) VALUES (?, ?, ?, 0, ?)
     ON CONFLICT(gallery_id, email) DO NOTHING`,
  ).run(randomUUID(), gallery.id, email, nowIso());

  const res = NextResponse.json({ ok: true, email });
  res.cookies.set({
    name: accessCookieName(gallery.id),
    value: signAccessToken(gallery.id, email, gallery.link_version),
    ...accessCookieOptions(),
  });
  return res;
}
