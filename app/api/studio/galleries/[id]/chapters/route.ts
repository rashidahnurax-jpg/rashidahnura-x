import { randomUUID } from "node:crypto";
import { db, nowIso, ready } from "@/lib/db";
import { maxChapterPosition, ownedGallery, studioUser } from "@/lib/studio";
import { jsonError, jsonOk, readJson, safeText, sameOrigin } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);

  const body = await readJson<{ title?: string }>(req);
  const title = safeText(body?.title, 80) || "Untitled chapter";
  const chapterId = randomUUID();
  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)").run(
    chapterId,
    gallery.id,
    title,
    maxChapterPosition(gallery.id),
    nowIso(),
  );
  db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(nowIso(), gallery.id);
  return jsonOk({ id: chapterId }, { status: 201 });
}
