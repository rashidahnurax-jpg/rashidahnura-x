import { db, nowIso, ready } from "@/lib/db";
import { ownedGallery, studioUser } from "@/lib/studio";
import { jsonError, jsonOk, readJson, sameOrigin } from "@/lib/http";
import type { MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);

  const body = await readJson<{ chapters?: { id: string; itemIds: string[] }[] }>(req);
  if (!body?.chapters || !Array.isArray(body.chapters)) return jsonError("Invalid order payload", 400);

  const chapters = db.prepare("SELECT id FROM chapters WHERE gallery_id = ?").all(gallery.id) as { id: string }[];
  const chapterIds = new Set(chapters.map((c) => c.id));
  const items = db
    .prepare("SELECT id FROM media_items WHERE gallery_id = ?")
    .all(gallery.id) as { id: string }[];
  const itemIds = new Set(items.map((i) => i.id));

  const updateChapter = db.prepare("UPDATE chapters SET position = ? WHERE id = ? AND gallery_id = ?");
  const updateItem = db.prepare(
    "UPDATE media_items SET chapter_id = ?, position = ?, updated_at = ? WHERE id = ? AND gallery_id = ?",
  );

  try {
    db.exec("BEGIN");
    body.chapters.forEach((chapter, chapterIndex) => {
      if (!chapterIds.has(chapter.id)) throw new Error("Unknown chapter");
      if (!Array.isArray(chapter.itemIds)) throw new Error("Invalid items");
      updateChapter.run(chapterIndex, chapter.id, gallery.id);
      chapter.itemIds.forEach((itemId, itemIndex) => {
        if (!itemIds.has(itemId)) throw new Error("Unknown item");
        updateItem.run(chapter.id, itemIndex, nowIso(), itemId, gallery.id);
      });
    });
    db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(nowIso(), gallery.id);
    db.exec("COMMIT");
  } catch {
    db.exec("ROLLBACK");
    return jsonError("That order could not be saved.", 400);
  }

  const refreshed = db
    .prepare("SELECT * FROM media_items WHERE gallery_id = ? ORDER BY position ASC")
    .all(gallery.id) as unknown as MediaItemRow[];
  return jsonOk({ items: refreshed.map((i) => ({ id: i.id, chapter_id: i.chapter_id, position: i.position })) });
}
