import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { maxItemPosition, ownedGallery, studioUser, titleFromFilename } from "@/lib/studio";
import { jsonError, jsonOk, readJson, safeText, sameOrigin } from "@/lib/http";
import { extractYoutubeId } from "@/lib/youtube";
import type { ChapterRow, MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);

  const body = await readJson<{ url?: string; title?: string; chapterId?: string }>(req);
  const videoId = extractYoutubeId(String(body?.url ?? ""));
  if (!videoId) return jsonError("That does not look like a YouTube link.", 400);

  let chapterId: string | null = null;
  if (body?.chapterId) {
    const chapter = get<ChapterRow>(
      "SELECT * FROM chapters WHERE id = ? AND gallery_id = ?",
      body.chapterId,
      gallery.id,
    );
    chapterId = chapter?.id ?? null;
  }
  if (!chapterId) {
    const first = get<ChapterRow>("SELECT * FROM chapters WHERE gallery_id = ? ORDER BY position ASC LIMIT 1", gallery.id);
    chapterId = first?.id ?? null;
  }

  let title = safeText(body?.title, 160);
  let warning: string | null = null;
  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=${encodeURIComponent(`https://www.youtube.com/watch?v=${videoId}`)}&format=json`,
      { signal: AbortSignal.timeout(7000), headers: { accept: "application/json" } },
    );
    if (!res.ok) {
      return jsonError("YouTube could not verify this film. Check that it is public or unlisted.", 400);
    }
    const data = (await res.json()) as { title?: string };
    if (!title && data.title) title = safeText(data.title, 160);
  } catch {
    warning = "YouTube could not be reached, so the film was saved without verification.";
  }

  const itemId = randomUUID();
  const now = nowIso();
  db.prepare(
    `INSERT INTO media_items
      (id, gallery_id, chapter_id, kind, title, status, position, original_name, mime, size_bytes,
       youtube_id, youtube_url, created_at, updated_at)
     VALUES (?, ?, ?, 'youtube', ?, 'ready', ?, NULL, NULL, 0, ?, ?, ?, ?)`,
  ).run(
    itemId,
    gallery.id,
    chapterId,
    title || titleFromFilename("YouTube film"),
    maxItemPosition(gallery.id),
    videoId,
    `https://www.youtube.com/watch?v=${videoId}`,
    now,
    now,
  );
  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(now, gallery.id);

  const item = get<MediaItemRow>("SELECT * FROM media_items WHERE id = ?", itemId);
  return jsonOk({ item, warning }, { status: 201 });
}
