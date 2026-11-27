import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

export const STORAGE_ROOT = path.join(process.cwd(), "storage");
export const MEDIA_ROOT = path.join(STORAGE_ROOT, "media");
export const TEMP_ROOT = path.join(STORAGE_ROOT, "tmp");
export const DB_PATH = path.join(STORAGE_ROOT, "nurax.sqlite");

export const APP_NAME = "NURA-X STUDIO";
export { ACCESS_MODES, accessModeMeta, type AccessMode } from "./access-modes";

let cachedSecret: string | null = null;

export function secrets(): { app: string } {
  if (process.env.NURAX_SECRET) return { app: process.env.NURAX_SECRET };
  if (cachedSecret) return { app: cachedSecret };
  // Stable per-install fallback so local dev sessions survive restarts.
  const secretPath = path.join(STORAGE_ROOT, ".secret");
  try {
    fs.mkdirSync(STORAGE_ROOT, { recursive: true });
    if (fs.existsSync(secretPath)) {
      cachedSecret = fs.readFileSync(secretPath, "utf8").trim();
    }
    if (!cachedSecret) {
      cachedSecret = crypto.randomBytes(32).toString("hex");
      fs.writeFileSync(secretPath, cachedSecret, { mode: 0o600 });
    }
  } catch {
    cachedSecret = "nurax-local-development-secret";
  }
  return { app: cachedSecret };
}

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024 * 1024; // 8 GB per file
export const CHUNK_SIZE = 4 * 1024 * 1024;

export const PHOTO_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif", ".tif", ".tiff", ".heic", ".heif"];
export const VIDEO_EXTENSIONS = [".mp4", ".mov", ".m4v", ".webm", ".ogv", ".mkv", ".avi"];
