import crypto from "node:crypto";
import { cookies } from "next/headers";
import { all, db, get, ready } from "./db";
import { secrets } from "./config";
import type { FlagshipMeta, GalleryRow, UserRow } from "./types";

export const ACCESS_COOKIE_PREFIX = "nx_g_";
const ACCESS_DAYS = 14;

export function accessCookieName(galleryId: string): string {
  return `${ACCESS_COOKIE_PREFIX}${galleryId}`;
}

export function accessCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: ACCESS_DAYS * 24 * 60 * 60,
  };
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secrets().app).update(payload).digest("base64url");
}

export function signAccessToken(galleryId: string, email: string, linkVersion: number): string {
  const payload = Buffer.from(
    JSON.stringify({
      g: galleryId,
      e: email.toLowerCase(),
      v: linkVersion,
      exp: Date.now() + ACCESS_DAYS * 24 * 60 * 60 * 1000,
    }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAccessToken(gallery: GalleryRow, token: string | undefined | null): string | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (signature.length !== expected.length) return null;
  try {
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      g: string;
      e: string;
      v: number;
      exp: number;
    };
    if (data.g !== gallery.id) return null;
    if (data.v !== gallery.link_version) return null;
    if (!data.exp || data.exp < Date.now()) return null;
    if (typeof data.e !== "string" || !data.e) return null;
    return data.e;
  } catch {
    return null;
  }
}

export async function readAccessCookie(galleryId: string): Promise<string | undefined> {
  const store = await cookies();
  return store.get(accessCookieName(galleryId))?.value;
}

export async function getGalleryBySlug(slug: string): Promise<GalleryRow | null> {
  await ready();
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE slug = ?", slug);
  return gallery ?? null;
}

export async function getGalleryById(id: string): Promise<GalleryRow | null> {
  await ready();
  const gallery = get<GalleryRow>("SELECT * FROM galleries WHERE id = ?", id);
  return gallery ?? null;
}

export function listGalleryEmails(galleryId: string): string[] {
  const rows = all<{ email: string }>(
    "SELECT email FROM gallery_emails WHERE gallery_id = ? ORDER BY created_at ASC LIMIT 500",
    galleryId,
  );
  return rows.map((r) => r.email);
}

export type AccessReason = "ok" | "locked" | "expired" | "revoked" | "unpublished" | "missing";

export interface AccessState {
  gallery: GalleryRow;
  browsable: boolean;
  canDownload: boolean;
  email: string | null;
  reason: AccessReason;
  isOwnerPreview: boolean;
  approved: string[];
}

export function parseMeta(gallery: GalleryRow): FlagshipMeta {
  if (!gallery.meta_json) return {};
  try {
    return JSON.parse(gallery.meta_json) as FlagshipMeta;
  } catch {
    return {};
  }
}

export function isOwnerOrAdmin(gallery: GalleryRow, user: UserRow | null): boolean {
  if (!user) return false;
  return user.role === "admin" || user.id === gallery.studio_id;
}

export async function evaluateAccess(
  gallery: GalleryRow,
  opts: { viewer?: UserRow | null; preview?: boolean } = {},
): Promise<AccessState> {
  const token = await readAccessCookie(gallery.id);
  const cookieEmail = verifyAccessToken(gallery, token);
  const reasonBase: AccessReason = !gallery.revoked_at
    ? gallery.status !== "published"
      ? "unpublished"
      : gallery.expires_at && new Date(gallery.expires_at).getTime() < Date.now()
        ? "expired"
        : "ok"
    : "revoked";

  const isOwnerPreview = Boolean(opts.preview && isOwnerOrAdmin(gallery, opts.viewer ?? null));
  const approved = gallery.access_mode === "invite" ? listGalleryEmails(gallery.id) : [];

  if (isOwnerPreview) {
    return {
      gallery,
      browsable: true,
      canDownload: true,
      email: opts.viewer?.email ?? null,
      reason: "ok",
      isOwnerPreview: true,
      approved,
    };
  }

  if (reasonBase !== "ok") {
    return {
      gallery,
      browsable: false,
      canDownload: false,
      email: null,
      reason: reasonBase,
      isOwnerPreview: false,
      approved,
    };
  }

  if (gallery.access_mode === "open") {
    return {
      gallery,
      browsable: true,
      canDownload: true,
      email: null,
      reason: "ok",
      isOwnerPreview: false,
      approved,
    };
  }

  if (gallery.access_mode === "email") {
    return {
      gallery,
      browsable: true,
      canDownload: Boolean(cookieEmail),
      email: cookieEmail,
      reason: "ok",
      isOwnerPreview: false,
      approved,
    };
  }

  if (gallery.access_mode === "password") {
    const unlocked = Boolean(cookieEmail);
    return {
      gallery,
      browsable: unlocked,
      canDownload: unlocked,
      email: cookieEmail,
      reason: unlocked ? "ok" : "locked",
      isOwnerPreview: false,
      approved,
    };
  }

  // invite
  const approvedLower = approved.map((e) => e.toLowerCase());
  const unlocked = Boolean(cookieEmail && approvedLower.includes(cookieEmail.toLowerCase()));
  return {
    gallery,
    browsable: unlocked,
    canDownload: unlocked,
    email: unlocked ? cookieEmail : null,
    reason: unlocked ? "ok" : "locked",
    isOwnerPreview: false,
    approved,
  };
}

export function recordView(galleryId: string): void {
  db.prepare("UPDATE galleries SET view_count = view_count + 1 WHERE id = ?").run(galleryId);
}

export function galleryHref(slug: string): string {
  return `/g/${slug}`;
}
