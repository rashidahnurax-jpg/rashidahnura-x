import { randomUUID } from "node:crypto";
import { db, get, nowIso, ready } from "@/lib/db";
import { ownedGallery, studioUser } from "@/lib/studio";
import { managerPayload } from "@/lib/manager";
import { hashPassword } from "@/lib/password";
import { jsonError, jsonOk, normalizeEmail, readJson, safeText, sameOrigin } from "@/lib/http";
import { removeGalleryFiles } from "@/lib/storage";
import type { GalleryRow, MediaItemRow } from "@/lib/types";

export const runtime = "nodejs";

const MODES = ["open", "email", "invite", "password"] as const;

function cleanExpiry(value: unknown): string | null | undefined {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return undefined;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T23:59:59`) : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString();
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);
  return jsonOk(managerPayload(gallery, user));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);

  const body = await readJson<Record<string, unknown>>(req);
  if (!body) return jsonError("Invalid request", 400);

  const sets: string[] = [];
  const values: unknown[] = [];
  const add = (clause: string, value: unknown) => {
    sets.push(clause);
    values.push(value);
  };

  let bumpVersion = false;

  if (body.title !== undefined) {
    const title = safeText(body.title, 120);
    if (!title) return jsonError("Gallery title cannot be empty.", 400);
    add("title = ?", title);
  }
  if (body.subtitle !== undefined) add("subtitle = ?", safeText(body.subtitle, 200) || null);
  if (body.description !== undefined) add("description = ?", safeText(body.description, 3000) || null);

  if (body.accessMode !== undefined) {
    const mode = String(body.accessMode);
    if (!MODES.includes(mode as (typeof MODES)[number])) return jsonError("Unknown access mode.", 400);
    if (mode !== gallery.access_mode) bumpVersion = true;
    add("access_mode = ?", mode);
  }

  const nextMode = body.accessMode !== undefined ? String(body.accessMode) : gallery.access_mode;

  if (typeof body.password === "string" && body.password.length > 0) {
    if (body.password.length < 8) return jsonError("Password must be at least 8 characters.", 400);
    add("password_hash = ?", hashPassword(body.password));
    bumpVersion = true;
  } else if (nextMode !== "password" && gallery.password_hash) {
    sets.push("password_hash = NULL");
  }

  if (body.allowPhotoDownloads !== undefined) add("allow_photo_downloads = ?", body.allowPhotoDownloads ? 1 : 0);
  if (body.allowVideoDownloads !== undefined) add("allow_video_downloads = ?", body.allowVideoDownloads ? 1 : 0);

  if (body.coverItemId !== undefined) {
    if (body.coverItemId === null || body.coverItemId === "") {
      add("cover_item_id = NULL", null);
    } else {
      const item = get<MediaItemRow>(
        "SELECT * FROM media_items WHERE id = ? AND gallery_id = ? AND status = 'ready'",
        String(body.coverItemId),
        gallery.id,
      );
      if (!item) return jsonError("That item cannot be used as a cover.", 400);
      add("cover_item_id = ?", item.id);
    }
  }

  if (body.expiresAt !== undefined) {
    const expiry = cleanExpiry(body.expiresAt);
    if (expiry === undefined) return jsonError("Enter a valid expiry date.", 400);
    add("expires_at = ?", expiry);
  }

  if (Array.isArray(body.invitedEmails)) {
    const emails = Array.from(
      new Set(
        body.invitedEmails
          .map((value) => normalizeEmail(value))
          .filter((value): value is string => Boolean(value)),
      ),
    ).slice(0, 200);
    db.prepare("DELETE FROM gallery_emails WHERE gallery_id = ?").run(gallery.id);
    const insert = db.prepare(
      "INSERT INTO gallery_emails (id, gallery_id, email, created_at) VALUES (?, ?, ?, ?)",
    );
    for (const email of emails) insert.run(randomUUID(), gallery.id, email, nowIso());
  }

  if (!sets.length) return jsonError("Nothing to update.", 400);
  if (bumpVersion) sets.push("link_version = link_version + 1");
  add("updated_at = ?", nowIso());

  db.prepare(`UPDATE galleries SET ${sets.join(", ")} WHERE id = ?`).run(...(values as never[]), gallery.id);

  const updated = get<GalleryRow>("SELECT * FROM galleries WHERE id = ?", gallery.id);
  return jsonOk({
    gallery: updated
      ? {
          ...updated,
          password_hash: undefined,
          invite_emails: undefined,
        }
      : null,
  });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const user = await studioUser();
  if (!user) return jsonError("Not authorised", 403);
  const { id } = await params;
  const gallery = ownedGallery(id, user.id);
  if (!gallery) return jsonError("Gallery not found", 404);
  if (gallery.kind === "flagship") return jsonError("The flagship gallery cannot be deleted.", 400);

  await removeGalleryFiles(gallery.id);
  db.prepare("DELETE FROM galleries WHERE id = ?").run(gallery.id);
  return jsonOk();
}
