import { db, get, nowIso, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { jsonError, jsonOk, readJson, safeText, sameOrigin } from "@/lib/http";
import { removeItemFiles } from "@/lib/storage";
import { maxItemPosition } from "@/lib/studio";
import type { ChapterRow, GalleryRow, MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

function loadOwned(itemId: string, studioId: string): { item: MediaItemRow; gallery: GalleryRow } | null {
  const item = get<MediaItemRow>("SELECT * FROM media_items WHERE id = ?", itemId);
  if (!item) return null;
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE id = ? AND studio_id = ?", item.gallery_id, studioId);
  if (!gallery) return null;
  return { item, gallery };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const owned = loadOwned(id, user.id);
  if (!owned) return jsonError("Item not found", 404);

  const body = await readJson<{ title?: string; chapterId?: string | null }>(req);
  if (!body) return jsonError("Invalid request", 400);

  if (body.title !== undefined) {
    const title = safeText(body.title, 160);
    db.prepare("UPDATE media_items SET title = ?, updated_at = ? WHERE id = ?").run(
      title || null,
      nowIso(),
      owned.item.id,
    );
  }

  if (body.chapterId !== undefined) {
    let chapterId: string | null = null;
    if (body.chapterId) {
      const chapter = get<ChapterRow>(
        "SELECT * FROM chapters WHERE id = ? AND gallery_id = ?",
        body.chapterId,
        owned.gallery.id,
      );
      if (!chapter) return jsonError("Chapter not found", 404);
      chapterId = chapter.id;
    }
    db.prepare("UPDATE media_items SET chapter_id = ?, position = ?, updated_at = ? WHERE id = ?").run(
      chapterId,
      maxItemPosition(owned.gallery.id),
      nowIso(),
      owned.item.id,
    );
  }

  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(nowIso(), owned.gallery.id);
  return jsonOk();
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const owned = loadOwned(id, user.id);
  if (!owned) return jsonError("Item not found", 404);

  await removeItemFiles(owned.gallery.id, owned.item.id);
  db.prepare("DELETE FROM media_items WHERE id = ?").run(owned.item.id);
  if (owned.gallery.cover_item_id === owned.item.id) {
    const fallback = get<{ id: string }>(
      "SELECT id FROM media_items WHERE gallery_id = ? AND status = 'ready' ORDER BY position ASC LIMIT 1",
      owned.gallery.id,
    );
    db.prepare("UPDATE galleries SET cover_item_id = ?, updated_at = ? WHERE id = ?").run(
      fallback?.id ?? null,
      nowIso(),
      owned.gallery.id,
    );
  } else {
    db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(nowIso(), owned.gallery.id);
  }

  return jsonOk();
}
