import { DatabaseSync } from "node:sqlite";
import fs from "node:fs";
import { DB_PATH, MEDIA_ROOT, STORAGE_ROOT, TEMP_ROOT } from "./config";
import { ensureFlagshipContent, seedDatabase, seedProductionAdmin } from "./seed";

declare global {
  // eslint-disable-next-line no-var
  var __nuraxDb: DatabaseSync | undefined;
  // eslint-disable-next-line no-var
  var __nuraxReady: Promise<void> | undefined;
}

function createConnection(): DatabaseSync {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true });
  fs.mkdirSync(MEDIA_ROOT, { recursive: true });
  fs.mkdirSync(TEMP_ROOT, { recursive: true });
  const db = new DatabaseSync(DB_PATH);
  db.exec("PRAGMA busy_timeout = 5000");
  db.exec("PRAGMA journal_mode = WAL");
  db.exec("PRAGMA foreign_keys = ON");
  return db;
}

export const db: DatabaseSync = globalThis.__nuraxDb ?? (globalThis.__nuraxDb = createConnection());

const SCHEMA = `
CREATE TABLE IF NOT EXISTS meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin','studio')),
  password_hash TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('invited','active','suspended')),
  storage_limit_bytes INTEGER NOT NULL DEFAULT 53687091200,
  invite_token TEXT,
  invite_expires_at TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);

CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS galleries (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  kind TEXT NOT NULL DEFAULT 'gallery' CHECK (kind IN ('gallery','flagship')),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','unpublished')),
  access_mode TEXT NOT NULL DEFAULT 'open' CHECK (access_mode IN ('open','email','invite','password')),
  password_hash TEXT,
  allow_photo_downloads INTEGER NOT NULL DEFAULT 1,
  allow_video_downloads INTEGER NOT NULL DEFAULT 1,
  featured INTEGER NOT NULL DEFAULT 0,
  cover_item_id TEXT,
  expires_at TEXT,
  revoked_at TEXT,
  link_version INTEGER NOT NULL DEFAULT 1,
  published_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  view_count INTEGER NOT NULL DEFAULT 0,
  meta_json TEXT
);

CREATE TABLE IF NOT EXISTS chapters (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS media_items (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  chapter_id TEXT REFERENCES chapters(id) ON DELETE SET NULL,
  kind TEXT NOT NULL CHECK (kind IN ('photo','video','youtube')),
  title TEXT,
  status TEXT NOT NULL DEFAULT 'uploading' CHECK (status IN ('uploading','ready','failed')),
  position INTEGER NOT NULL DEFAULT 0,
  original_name TEXT,
  mime TEXT,
  size_bytes INTEGER NOT NULL DEFAULT 0,
  width INTEGER,
  height INTEGER,
  preview_path TEXT,
  thumb_path TEXT,
  poster_path TEXT,
  storage_path TEXT,
  attachment_path TEXT,
  attachment_name TEXT,
  attachment_size INTEGER,
  youtube_id TEXT,
  youtube_url TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS gallery_emails (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE (gallery_id, email)
);

CREATE TABLE IF NOT EXISTS visitors (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE (gallery_id, email)
);

CREATE TABLE IF NOT EXISTS otp_codes (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  consumed_at TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS selections (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  email TEXT,
  note TEXT,
  item_ids TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS downloads (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  item_id TEXT,
  email TEXT,
  kind TEXT NOT NULL,
  bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS upload_failures (
  id TEXT PRIMARY KEY,
  studio_id TEXT NOT NULL,
  gallery_id TEXT,
  file_name TEXT,
  size_bytes INTEGER,
  stage TEXT NOT NULL,
  detail TEXT,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS access_attempts (
  id TEXT PRIMARY KEY,
  gallery_id TEXT NOT NULL REFERENCES galleries(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  client TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS signup_attempts (
  email TEXT NOT NULL,
  client TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS upload_sessions (
  id TEXT PRIMARY KEY,
  media_id TEXT REFERENCES media_items(id) ON DELETE CASCADE,
  target TEXT NOT NULL DEFAULT 'media' CHECK (target IN ('media','attachment')),
  expected_size INTEGER NOT NULL,
  received_bytes INTEGER NOT NULL DEFAULT 0,
  temp_path TEXT NOT NULL,
  kind TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_galleries_studio ON galleries(studio_id);
CREATE INDEX IF NOT EXISTS idx_galleries_slug ON galleries(slug);
CREATE INDEX IF NOT EXISTS idx_chapters_gallery ON chapters(gallery_id, position);
CREATE INDEX IF NOT EXISTS idx_media_gallery ON media_items(gallery_id, position);
CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_downloads_gallery ON downloads(gallery_id, created_at);
CREATE INDEX IF NOT EXISTS idx_otp_lookup ON otp_codes(gallery_id, email, created_at);
CREATE INDEX IF NOT EXISTS idx_access_attempts ON access_attempts(gallery_id, kind, client, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_email ON signup_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_signup_attempts_client ON signup_attempts(client, created_at);
`;

async function initialize(): Promise<void> {
  db.exec(SCHEMA);
  const version = db.prepare("SELECT value FROM meta WHERE key = 'seed_version'").get() as
    | { value: string }
    | undefined;
  if (!version) {
    const existing = db.prepare("SELECT COUNT(*) AS count FROM users").get() as { count: number };
    if (existing.count > 0) {
      // Existing install (possibly from an interrupted seed): never re-seed over real data.
      db.prepare("INSERT INTO meta (key, value) VALUES ('seed_version', 'existing')").run();
    } else if (process.env.NODE_ENV === "production" && process.env.NURAX_SEED_DEMO !== "1") {
      await seedProductionAdmin(db);
    } else {
      await seedDatabase(db);
    }
  }
  await ensureFlagshipContent(db);
  db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(new Date().toISOString());
}

export function ready(): Promise<void> {
  if (!globalThis.__nuraxReady) {
    globalThis.__nuraxReady = initialize().catch((err) => {
      globalThis.__nuraxReady = undefined;
      throw err;
    });
  }
  return globalThis.__nuraxReady;
}

export function all<T>(sql: string, ...params: unknown[]): T[] {
  return db.prepare(sql).all(...(params as never[])) as unknown as T[];
}

export function get<T>(sql: string, ...params: unknown[]): T | undefined {
  return db.prepare(sql).get(...(params as never[])) as unknown as T | undefined;
}

export function run(sql: string, ...params: unknown[]) {
  return db.prepare(sql).run(...(params as never[]));
}

export function transaction<T>(fn: () => T): T {
  db.exec("BEGIN");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (err) {
    db.exec("ROLLBACK");
    throw err;
  }
}

export function nowIso(): string {
  return new Date().toISOString();
}
