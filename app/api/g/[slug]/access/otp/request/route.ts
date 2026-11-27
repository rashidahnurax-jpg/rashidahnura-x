import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { getGalleryBySlug, listGalleryEmails } from "@/lib/access";
import { randomCode, sha256 } from "@/lib/password";
import { isExpired } from "@/lib/format";
import { deliverOneTimeCode } from "@/lib/mail";
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

  const body = await readJson<{ email?: string }>(req);
  const email = normalizeEmail(body?.email);
  if (!email) return jsonError("Enter the email the studio approved.", 400);

  const allowed = listGalleryEmails(gallery.id).some((e) => e.toLowerCase() === email);
  const id = randomUUID();
  const code = randomCode();
  const now = nowIso();
  const recentSince = new Date(Date.now() - 10 * 60 * 1000).toISOString();

  // Reserve a request for every address so throttling does not reveal the invite list.
  // Non-invited addresses receive an unusable, already-consumed placeholder.
  db.exec("BEGIN IMMEDIATE");
  try {
    const recent = get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM otp_codes WHERE gallery_id = ? AND email = ? AND created_at > ?",
      gallery.id, email, recentSince,
    )?.count;
    if (Number(recent) >= 4) {
      db.exec("COMMIT");
      return jsonError("Too many codes requested. Try again in a few minutes.", 429);
    }
    db.prepare("UPDATE otp_codes SET consumed_at = ? WHERE gallery_id = ? AND email = ? AND consumed_at IS NULL")
      .run(now, gallery.id, email);
    db.prepare(
      "INSERT INTO otp_codes (id, gallery_id, email, code_hash, expires_at, attempts, consumed_at, created_at) VALUES (?, ?, ?, ?, ?, 0, ?, ?)",
    ).run(id, gallery.id, email, sha256(`${gallery.id}:${code}:${email}`),
      new Date(Date.now() + 10 * 60 * 1000).toISOString(), allowed ? null : now, now);
    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  if (!allowed) {
    return Response.json({
      ok: true,
      message: "If that email is approved, a six-digit code will be sent. Check your inbox.",
    });
  }

  const studioRow = get<{ name: string }>("SELECT name FROM users WHERE id = ?", gallery.studio_id);
  const delivery = await deliverOneTimeCode({
    email,
    code,
    galleryTitle: gallery.title,
    studioName: studioRow?.name ?? "The studio",
  });

  if (!delivery.delivered && !delivery.demoCode) {
    db.prepare("UPDATE otp_codes SET consumed_at = ? WHERE id = ? AND consumed_at IS NULL").run(nowIso(), id);
    return jsonError(
      delivery.unavailable
        ? "Code delivery is not configured on this deployment yet. Ask the studio for another way in."
        : "Email delivery is unavailable right now. Please try again shortly.",
      503,
    );
  }

  return Response.json({
    ok: true,
    message: delivery.demoCode
      ? "No mail provider is connected in development, so the code is shown here."
      : "If that email is approved, a six-digit code will be sent. Check your inbox.",
    delivery: delivery.demoCode ? "on-screen" : "email",
    ...(delivery.demoCode ? { demoCode: delivery.demoCode } : {}),
  });
}
