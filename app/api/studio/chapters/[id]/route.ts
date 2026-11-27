import { db, get, nowIso, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { jsonError, jsonOk, readJson, safeText, sameOrigin } from "@/lib/http";
import type { ChapterRow, GalleryRow } from "@/lib/types";

export const runtime = "nodejs";

function ownedChapter(chapterId: string, studioId: string): { chapter: ChapterRow; gallery: GalleryRow } | null {
  const chapter = get<ChapterRow>("SELECT * FROM chapters WHERE id = ?", chapterId);
  if (!chapter) return null;
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE id = ? AND studio_id = ?", chapter.gallery_id, studioId);
  if (!gallery) return null;
  return { chapter, gallery };
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const owned = ownedChapter(id, user.id);
  if (!owned) return jsonError("Chapter not found", 404);

  const body = await readJson<{ title?: string }>(req);
  const title = safeText(body?.title, 80);
  if (!title) return jsonError("Chapter title cannot be empty.", 400);
  db.prepare("UPDATE chapters SET title = ? WHERE id = ?").run(title, owned.chapter.id);
  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(nowIso(), owned.gallery.id);
  return jsonOk();
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const owned = ownedChapter(id, user.id);
  if (!owned) return jsonError("Chapter not found", 404);

  const others = get<ChapterRow>(
    "SELECT * FROM chapters WHERE gallery_id = ? AND id != ? ORDER BY position ASC LIMIT 1",
    owned.gallery.id,
    owned.chapter.id,
  );
  const items = get<{ count: number }>(
    "SELECT COUNT(*) AS count FROM media_items WHERE chapter_id = ?",
    owned.chapter.id,
  )?.count;

  if (Number(items) > 0) {
    if (!others) return jsonError("Move these items to another chapter before deleting the last chapter.", 409);
    const max = get<{ max: number | null }>(
      "SELECT MAX(position) AS max FROM media_items WHERE gallery_id = ?",
      owned.gallery.id,
    );
    db.prepare("UPDATE media_items SET chapter_id = ?, position = position + ? WHERE chapter_id = ?").run(
      others.id,
      Number(max?.max ?? 0) + 1,
      owned.chapter.id,
    );
  }

  db.prepare("DELETE FROM chapters WHERE id = ?").run(owned.chapter.id);
  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(nowIso(), owned.gallery.id);
  return jsonOk();
}
