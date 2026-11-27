import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { evaluateAccess, getGalleryBySlug } from "@/lib/access";
import { jsonError, jsonOk, normalizeEmail, readJson, safeText, sameOrigin } from "@/lib/http";
import type { MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const { slug } = await params;
  const gallery = await getGalleryBySlug(slug);
  if (!gallery) return jsonError("Gallery not found", 404);

  const access = await evaluateAccess(gallery);
  if (!access.browsable) return jsonError("This gallery is not available.", access.reason === "locked" ? 403 : 410);

  const body = await readJson<{ email?: string; note?: string; itemIds?: string[] }>(req);
  const ids = Array.isArray(body?.itemIds) ? Array.from(new Set(body.itemIds.map(String))).slice(0, 100) : [];
  if (!ids.length) return jsonError("Select at least one photograph.", 400);

  const valid = ids.filter((id) => {
    const item = get<MediaItemRow>(
      "SELECT id FROM media_items WHERE id = ? AND gallery_id = ? AND status = 'ready'",
      id,
      gallery.id,
    );
    return Boolean(item);
  });
  if (!valid.length) return jsonError("Select at least one photograph.", 400);

  const email = normalizeEmail(body?.email) ?? access.email;
  const note = safeText(body?.note, 800);

  db.prepare(
    "INSERT INTO selections (id, gallery_id, email, note, item_ids, created_at) VALUES (?, ?, ?, ?, ?, ?)",
  ).run(randomUUID(), gallery.id, email, note || null, JSON.stringify(valid), nowIso());

  return jsonOk({ count: valid.length });
}
