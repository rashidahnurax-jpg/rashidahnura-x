import { db, get, nowIso, ready } from "@/lib/db";
import { ownedGallery, studioUser } from "@/lib/studio";
import { jsonError, jsonOk, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);
  if (gallery.revoked_at) {
    return jsonError("This link was revoked by NURA-X STUDIO. Contact the admin to restore it.", 409);
  }
  if (gallery.expires_at && new Date(gallery.expires_at).getTime() < Date.now()) {
    return jsonError("The expiry date is in the past. Choose a new date before publishing.", 400);
  }

  const readyCount = get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM media_items WHERE gallery_id = ? AND status = 'ready'",
    gallery.id,
  )?.count;
  if (!readyCount) return jsonError("Add at least one photo or film before publishing.", 400);

  if (gallery.access_mode === "password" && !gallery.password_hash) {
    return jsonError("Set the gallery password before publishing.", 400);
  }
  if (gallery.access_mode === "invite") {
    const emails = get<{ count: number }>(
      "SELECT COUNT(*) AS count FROM gallery_emails WHERE gallery_id = ?",
      gallery.id,
    )?.count;
    if (!emails) return jsonError("Add at least one approved email before publishing an invite-only gallery.", 400);
  }

  const now = nowIso();
  db.prepare(
    `UPDATE galleries SET status = 'published', published_at = COALESCE(published_at, ?),
      revoked_at = NULL, updated_at = ? WHERE id = ?`,
  ).run(now, now, gallery.id);
  db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(now, user.id);

  return jsonOk({ slug: gallery.slug, path: `/g/${gallery.slug}` });
}
