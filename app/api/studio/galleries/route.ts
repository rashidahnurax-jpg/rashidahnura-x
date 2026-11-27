import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { studioUser } from "@/lib/studio";
import { slugify } from "@/lib/format";
import { jsonError, jsonOk, readJson, safeText, sameOrigin } from "@/lib/http";
import { studioUsageBytes, studioPendingBytes } from "@/lib/data";

export const runtime = "nodejs";

function uniqueSlug(title: string): string {
  const base = slugify(title) || "gallery";
  for (let i = 0; i < 8; i += 1) {
    const suffix = Math.random().toString(36).slice(2, 6);
    const candidate = `${base.slice(0, 52)}-${suffix}`;
    const existing = get<{ id: string }>("SELECT id FROM galleries WHERE slug = ?", candidate);
    if (!existing) return candidate;
  }
  return `${base.slice(0, 40)}-${Date.now().toString(36)}`;
}

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);

  const body = await readJson<{
    title?: string;
    subtitle?: string;
    accessMode?: string;
    allowPhotoDownloads?: boolean;
    allowVideoDownloads?: boolean;
  }>(req);
  const title = safeText(body?.title, 120);
  if (!title) return jsonError("Give the gallery a title.", 400);
  const subtitle = safeText(body?.subtitle, 200);
  const accessMode = ["open", "email", "invite", "password"].includes(body?.accessMode ?? "")
    ? (body?.accessMode as string)
    : "open";

  if (studioUsageBytes(user.id) + studioPendingBytes(user.id) > user.storage_limit_bytes) {
    return jsonError("Your storage is full. Free up space or ask NURA-X for more.", 403);
  }

  const id = randomUUID();
  const slug = uniqueSlug(title);
  const now = nowIso();
  db.prepare(
    `INSERT INTO galleries
      (id, studio_id, slug, title, subtitle, description, kind, status, access_mode, password_hash,
       allow_photo_downloads, allow_video_downloads, featured, cover_item_id, expires_at, revoked_at,
       link_version, published_at, created_at, updated_at, view_count, meta_json)
     VALUES (?, ?, ?, ?, ?, '', 'gallery', 'draft', ?, NULL, ?, ?, 0, NULL, NULL, NULL, 1, NULL, ?, ?, 0, NULL)`,
  ).run(
    id,
    user.id,
    slug,
    title,
    subtitle || null,
    accessMode,
    body?.allowPhotoDownloads === false ? 0 : 1,
    body?.allowVideoDownloads === false ? 0 : 1,
    now,
    now,
  );

  const chapterId = randomUUID();
  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, 0, ?)").run(
    chapterId,
    id,
    "Chapter One",
    now,
  );

  return jsonOk({ id, slug }, { status: 201 });
}

export const dynamic = "force-dynamic";
