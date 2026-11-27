import { db, nowIso, ready } from "@/lib/db";
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

  const now = nowIso();
  db.prepare(
    "UPDATE galleries SET status = 'unpublished', link_version = link_version + 1, updated_at = ? WHERE id = ?",
  ).run(now, gallery.id);
  return jsonOk();
}
