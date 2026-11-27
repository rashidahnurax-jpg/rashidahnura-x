import { db, get, nowIso, ready } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, readJson, sameOrigin } from "@/lib/http";
import type { GalleryRow } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return jsonError("Not authorised", 403);

  const { id } = await params;
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE id = ?", id);
  if (!gallery) return jsonError("Gallery not found", 404);
  const body = await readJson<{ featured?: boolean; revoke?: boolean; unpublish?: boolean; restore?: boolean }>(req);
  if (!body || typeof body !== "object") return jsonError("Invalid request", 400);
  if (body.featured !== undefined && typeof body.featured !== "boolean") return jsonError("Invalid featured value", 400);
  if ([body.revoke, body.unpublish, body.restore].some((value) => value !== undefined && typeof value !== "boolean")) {
    return jsonError("Invalid action", 400);
  }
  const actions = [body.revoke, body.unpublish, body.restore].filter(Boolean).length;
  if (actions > 1 || (actions === 0 && body.featured === undefined)) return jsonError("Choose one action.", 400);
  if (gallery.kind === "flagship" && body.unpublish) return jsonError("The flagship gallery cannot be unpublished.", 400);
  if (body.unpublish && gallery.revoked_at) return jsonError("Restore the link before unpublishing.", 400);
  if (body.restore && !gallery.revoked_at) return jsonError("This link is not revoked.", 400);

  if (body.featured !== undefined) {
    db.prepare("UPDATE galleries SET featured = ?, updated_at = ? WHERE id = ?").run(body.featured ? 1 : 0, nowIso(), id);
  }

  if (body.revoke) {
    if (!gallery.revoked_at) {
      db.prepare(
        "UPDATE galleries SET revoked_at = ?, link_version = link_version + 1, updated_at = ? WHERE id = ?",
      ).run(nowIso(), nowIso(), id);
    }
  } else if (body.unpublish) {
    db.prepare(
      "UPDATE galleries SET status = 'unpublished', link_version = link_version + 1, updated_at = ? WHERE id = ?",
    ).run(nowIso(), id);
  } else if (body.restore) {
    db.prepare("UPDATE galleries SET revoked_at = NULL, updated_at = ? WHERE id = ?").run(nowIso(), id);
  }

  return jsonOk();
}
