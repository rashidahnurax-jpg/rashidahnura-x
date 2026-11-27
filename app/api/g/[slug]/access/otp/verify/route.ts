import crypto from "node:crypto";
import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { db, get, nowIso, ready } from "@/lib/db";
import { accessCookieName, accessCookieOptions, getGalleryBySlug, listGalleryEmails, signAccessToken } from "@/lib/access";
import { sha256 } from "@/lib/password";
import { isExpired } from "@/lib/format";
import { jsonError, normalizeEmail, readJson, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return jsonError("Gallery not found", 404);
  if (gallery.access_mode !== "invite") return jsonError("This gallery is not invite-only.", 400);
  if (gallery.status !== "published" || gallery.revoked_at || isExpired(gallery.expires_at)) {
    return jsonError("This gallery link is no longer active.", 410);
  }

  const body = await readJson<{ email?: string; code?: string }>(req);
  const email = normalizeEmail(body?.email);
  const code = typeof body?.code === "string" ? body.code : "";
  if (!email || !/^\d{6}$/.test(code)) return jsonError("Enter your email and the six-digit code.", 400);

  const approved = listGalleryEmails(gallery.id).map((e) => e.toLowerCase());
  if (!approved.includes(email)) return jsonError("That code is not valid.", 401);

  const record = get<{ id: string; code_hash: string; expires_at: string; attempts: number; consumed_at: string | null }>(
    "SELECT * FROM otp_codes WHERE gallery_id = ? AND email = ? AND consumed_at IS NULL ORDER BY created_at DESC LIMIT 1",
    gallery.id,
    email,
  );
  if (!record) return jsonError("Request a new code.", 400);
  if (record.expires_at && new Date(record.expires_at).getTime() < Date.now()) {
    return jsonError("That code has expired. Request a new one.", 410);
  }
  if (record.attempts >= 5) return jsonError("Too many attempts. Request a new code.", 429);

  const expected = Buffer.from(record.code_hash, "hex");
  const provided = Buffer.from(sha256(`${gallery.id}:${code}:${email}`), "hex");
  const valid = expected.length === provided.length && crypto.timingSafeEqual(expected, provided);
  if (!valid) {
    const attempt = db.prepare(
      "UPDATE otp_codes SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL AND attempts < 5 AND expires_at > ?",
    ).run(record.id, nowIso());
    if (!attempt.changes) return jsonError("That code is no longer valid. Request a new one.", 401);
    return jsonError("That code is not correct.", 401);
  }

  const consumed = db.prepare(
    "UPDATE otp_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL AND attempts < 5 AND expires_at > ?",
  ).run(nowIso(), record.id, nowIso());
  if (!consumed.changes) return jsonError("That code is no longer valid. Request a new one.", 401);
  db.prepare(
    `INSERT INTO visitors (id, gallery_id, email, verified, created_at) VALUES (?, ?, ?, 1, ?)
     ON CONFLICT(gallery_id, email) DO UPDATE SET verified = 1`,
  ).run(randomUUID(), gallery.id, email, nowIso());

  const res = NextResponse.json({ ok: true, email });
  res.cookies.set({
    name: accessCookieName(gallery.id),
    value: signAccessToken(gallery.id, email, gallery.link_version),
    ...accessCookieOptions(),
  });
  return res;
}
