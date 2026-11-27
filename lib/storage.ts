import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
// archiver v8 is ESM-only and exposes ZipArchive; @types/archiver still describes the v6 callable export.
// @ts-expect-error runtime named export missing from @types/archiver
import { ZipArchive } from "archiver";
import sharp from "sharp";
import { MEDIA_ROOT, TEMP_ROOT } from "./config";

const ID_PATTERN = /^[a-zA-Z0-9_-]{8,64}$/;

export function assertSafeId(id: string): string {
  if (!ID_PATTERN.test(id)) throw new Error("Invalid identifier");
  return id;
}

export function itemDir(galleryId: string, itemId: string): string {
  return path.join(MEDIA_ROOT, assertSafeId(galleryId), assertSafeId(itemId));
}

export function galleryDir(galleryId: string): string {
  return path.join(MEDIA_ROOT, assertSafeId(galleryId));
}

export function tempFile(mediaId: string): string {
  return path.join(TEMP_ROOT, `${assertSafeId(mediaId)}.part`);
}

export function posterTempFile(mediaId: string): string {
  return path.join(TEMP_ROOT, `${assertSafeId(mediaId)}.poster`);
}

export function storageAbs(relativePath: string | null | undefined): string | null {
  if (!relativePath) return null;
  const abs = path.resolve(MEDIA_ROOT, relativePath);
  if (!abs.startsWith(path.resolve(MEDIA_ROOT))) return null;
  return abs;
}

export function relativeMediaPath(abs: string): string {
  return path.relative(MEDIA_ROOT, abs).split(path.sep).join("/");
}

export function mimeForName(name: string): string {
  const ext = path.extname(name).toLowerCase();
  const map: Record<string, string> = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".avif": "image/avif",
    ".tif": "image/tiff",
    ".tiff": "image/tiff",
    ".heic": "image/heic",
    ".heif": "image/heif",
    ".mp4": "video/mp4",
    ".m4v": "video/x-m4v",
    ".mov": "video/quicktime",
    ".webm": "video/webm",
    ".ogv": "video/ogg",
    ".mkv": "video/x-matroska",
    ".avi": "video/x-msvideo",
  };
  return map[ext] ?? "application/octet-stream";
}

export interface PhotoDerivatives {
  width: number;
  height: number;
  previewPath: string;
  thumbPath: string;
}

export async function buildPhotoDerivatives(absOriginal: string, dir: string): Promise<PhotoDerivatives> {
  await fsp.mkdir(dir, { recursive: true });
  const image = sharp(absOriginal, { failOn: "none" }).rotate();
  const metadata = await image.metadata();
  const width = metadata.width ?? null;
  const height = metadata.height ?? null;

  const previewAbs = path.join(dir, "preview.webp");
  const thumbAbs = path.join(dir, "thumb.webp");

  await sharp(absOriginal, { failOn: "none" })
    .rotate()
    .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 84 })
    .toFile(previewAbs);

  await sharp(absOriginal, { failOn: "none" })
    .rotate()
    .resize({ width: 720, height: 720, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(thumbAbs);

  return {
    width,
    height,
    previewPath: relativeMediaPath(previewAbs),
    thumbPath: relativeMediaPath(thumbAbs),
  };
}

export async function buildPosterDerivatives(posterSource: string, dir: string): Promise<string> {
  await fsp.mkdir(dir, { recursive: true });
  const out = path.join(dir, "poster.webp");
  await sharp(posterSource, { failOn: "none" })
    .rotate()
    .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80 })
    .toFile(out);
  return relativeMediaPath(out);
}

export async function removeItemFiles(galleryId: string, itemId: string): Promise<void> {
  await fsp.rm(itemDir(galleryId, itemId), { recursive: true, force: true });
  await fsp.rm(tempFile(itemId), { force: true });
  await fsp.rm(posterTempFile(itemId), { force: true });
}

export async function removeGalleryFiles(galleryId: string): Promise<void> {
  await fsp.rm(galleryDir(galleryId), { recursive: true, force: true });
}

function encodeFilename(name: string): string {
  const fallback = name.replace(/[^\x20-\x7e]/g, "_").replace(/"/g, "'");
  return `filename="${fallback}"; filename*=UTF-8''${encodeURIComponent(name)}`;
}

export interface FileResponseOptions {
  absolutePath: string;
  mime: string;
  filename: string;
  inline?: boolean;
  cacheControl?: string;
}

export async function serveFile(req: Request, opts: FileResponseOptions): Promise<Response> {
  let stat: fs.Stats;
  try {
    stat = await fsp.stat(opts.absolutePath);
  } catch {
    return new Response("Not found", { status: 404 });
  }
  if (!stat.isFile()) return new Response("Not found", { status: 404 });

  const size = stat.size;
  const rangeHeader = req.headers.get("range");
  const baseHeaders: Record<string, string> = {
    "Content-Type": opts.mime || "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": opts.cacheControl ?? "private, max-age=0, must-revalidate",
    "Content-Disposition": `${opts.inline ? "inline" : "attachment"}; ${encodeFilename(opts.filename)}`,
    "X-Content-Type-Options": "nosniff",
  };

  if (rangeHeader) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
    if (match) {
      let start = match[1] ? Number(match[1]) : 0;
      let end = match[2] ? Number(match[2]) : size - 1;
      if (!match[1] && match[2]) {
        start = Math.max(size - Number(match[2]), 0);
        end = size - 1;
      }
      if (Number.isNaN(start) || Number.isNaN(end) || start > end || start >= size) {
        return new Response("Range not satisfiable", {
          status: 416,
          headers: { "Content-Range": `bytes */${size}` },
        });
      }
      end = Math.min(end, size - 1);
      const stream = fs.createReadStream(opts.absolutePath, { start, end });
      return new Response(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
        status: 206,
        headers: {
          ...baseHeaders,
          "Content-Length": String(end - start + 1),
          "Content-Range": `bytes ${start}-${end}/${size}`,
        },
      });
    }
  }

  const stream = fs.createReadStream(opts.absolutePath);
  return new Response(Readable.toWeb(stream) as unknown as ReadableStream<Uint8Array>, {
    status: 200,
    headers: { ...baseHeaders, "Content-Length": String(size) },
  });
}

export interface ZipEntry {
  absolutePath: string;
  name: string;
  size: number;
}

export function streamingZip(entries: ZipEntry[], zipName: string): Response {
  const archive = new ZipArchive({ zlib: { level: 6 } });
  const used = new Set<string>();
  for (const entry of entries) {
    let name = entry.name.replace(/[\\/:*?"<>|]/g, "-").trim() || "file";
    let candidate = name;
    let i = 2;
    while (used.has(candidate.toLowerCase())) {
      const ext = path.extname(name);
      const base = path.basename(name, ext);
      candidate = `${base}-${i}${ext}`;
      i += 1;
    }
    used.add(candidate.toLowerCase());
    archive.file(entry.absolutePath, { name: candidate });
  }
  archive.finalize().catch(() => undefined);

  return new Response(Readable.toWeb(archive) as unknown as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; ${encodeFilename(zipName)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export function fileSize(absPath: string | null | undefined): number {
  if (!absPath) return 0;
  try {
    return fs.statSync(absPath).size;
  } catch {
    return 0;
  }
}
