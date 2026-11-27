import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { randomToken } from "./password";
import { buildPhotoDerivatives, itemDir, relativeMediaPath } from "./storage";
import flagshipHighlights from "./flagship-highlights.json";

const SEED_DATE = new Date().toISOString();
const FLAGSHIP_VIDEOS = [
  { title: "LIVE STREAM RECORDING", id: "7LNzNPG24JQ" },
  { title: "JOIN US", id: "KPLLFkyH34s" },
  { title: "CITATION", id: "GWJy8pB6TGE" },
  { title: "WHEN THE MACHINE LEARNS WHY?", id: "WaORQ3mu9GQ" },
  { title: "THE ARRIVAL AND PROCEEDING OF THE SENATE COUNCIL MEMBERS", id: "hnFLGBoZLHM" },
] as const;

function stableSeedId(value: string): string {
  const hash = createHash("sha256").update(`nura-x-seed:${value}`).digest("hex").slice(0, 32);
  return `${hash.slice(0, 8)}-${hash.slice(8, 12)}-5${hash.slice(13, 16)}-${((parseInt(hash[16], 16) & 3) | 8)
    .toString(16)}${hash.slice(17, 20)}-${hash.slice(20)}`;
}

async function seedPhoto(
  db: DatabaseSync,
  galleryId: string,
  chapterId: string,
  sourceRelative: string,
  title: string,
  position: number,
): Promise<string> {
  const id = stableSeedId(`photo:${galleryId}:${sourceRelative}`);
  const dir = itemDir(galleryId, id);
  fs.mkdirSync(dir, { recursive: true });
  const extension = path.extname(sourceRelative) || ".jpg";
  const originalAbs = path.join(dir, `original${extension}`);
  const seedRoot = path.resolve(process.cwd(), "assets", "seed");
  const sourceAbs = path.resolve(seedRoot, sourceRelative);
  if (!sourceAbs.startsWith(`${seedRoot}${path.sep}`)) throw new Error("Invalid seed photo path.");
  fs.copyFileSync(sourceAbs, originalAbs);
  const derivatives = await buildPhotoDerivatives(originalAbs, dir);
  const size = fs.statSync(originalAbs).size;

  db.prepare(
    `INSERT INTO media_items
      (id, gallery_id, chapter_id, kind, title, status, position, original_name, mime, size_bytes,
       width, height, preview_path, thumb_path, storage_path, created_at, updated_at)
     VALUES (?, ?, ?, 'photo', ?, 'ready', ?, ?, 'image/jpeg', ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    galleryId,
    chapterId,
    title,
    position,
    path.basename(sourceRelative),
    size,
    derivatives.width,
    derivatives.height,
    derivatives.previewPath,
    derivatives.thumbPath,
    relativeMediaPath(originalAbs),
    SEED_DATE,
    SEED_DATE,
  );
  return id;
}

export async function seedProductionAdmin(db: DatabaseSync): Promise<void> {
  const email = process.env.NURAX_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.NURAX_ADMIN_PASSWORD;
  if (!email || !password || password.length < 12) {
    console.warn(
      "NURA-X: no accounts exist. Set NURAX_ADMIN_EMAIL and NURAX_ADMIN_PASSWORD (12+ characters) to bootstrap the first admin.",
    );
    return;
  }
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, status, storage_limit_bytes, created_at)
     VALUES (?, ?, ?, 'admin', ?, 'active', ?, ?)`,
  ).run(
    randomUUID(),
    email,
    process.env.NURAX_ADMIN_NAME?.trim() || "NURA-X Admin",
    hashPassword(password),
    50 * 1024 ** 3,
    now,
  );
  db.prepare("INSERT INTO meta (key, value) VALUES ('seed_version', 'production-admin'), ('seeded_at', ?)").run(now);
}

function getOrCreateChapter(
  db: DatabaseSync,
  galleryId: string,
  title: string,
  now: string,
): { id: string; created: boolean } {
  const chapter = db
    .prepare("SELECT id FROM chapters WHERE gallery_id = ? AND title = ?")
    .get(galleryId, title) as { id: string } | undefined;
  if (chapter) return { id: chapter.id, created: false };

  const position =
    Number(
      (
        db.prepare("SELECT COALESCE(MAX(position), -1) AS max FROM chapters WHERE gallery_id = ?").get(galleryId) as {
          max: number;
        }
      ).max,
    ) + 1;
  const id = stableSeedId(`chapter:${galleryId}:${title}`);
  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, ?, ?)").run(
    id,
    galleryId,
    title,
    position,
    now,
  );
  return { id, created: true };
}

export async function ensureFlagshipContent(db: DatabaseSync): Promise<void> {
  let gallery = db
    .prepare("SELECT id FROM galleries WHERE slug = ?")
    .get("intentional-intelligence") as { id: string } | undefined;

  if (!gallery) {
    const admin = db
      .prepare("SELECT id FROM users WHERE role = 'admin' AND status = 'active' ORDER BY created_at LIMIT 1")
      .get() as { id: string } | undefined;
    if (!admin) return;

    const now = new Date().toISOString();
    const id = stableSeedId("gallery:intentional-intelligence");
    db.prepare(
      `INSERT INTO galleries
        (id, studio_id, slug, title, subtitle, description, kind, status, access_mode,
         allow_photo_downloads, allow_video_downloads, featured, link_version, published_at,
         created_at, updated_at, view_count, meta_json)
       VALUES (?, ?, 'intentional-intelligence', 'Intentional Intelligence',
         'From Digital Trust to Human Flourishing',
         'The 65th Inaugural Lecture of Nasarawa State University, Keffi — delivered by Professor Rashidah Funke Olanrewaju.',
         'flagship', 'published', 'open', 1, 1, 1, 1, ?, ?, ?, 0, ?)`,
    ).run(
      id,
      admin.id,
      now,
      now,
      now,
      JSON.stringify({
        series: "65th Inaugural Lecture Series of NSUK",
        institution: "Nasarawa State University, Keffi",
        lecturer: "Professor Rashidah Funke Olanrewaju",
        lectureTitle: "Intentional Intelligence",
      }),
    );
    gallery = { id };
  }

  await seedFlagshipAdditions(db, gallery.id);
}

async function seedFlagshipAdditions(db: DatabaseSync, galleryId: string): Promise<void> {
  const now = new Date().toISOString();
  const photoChapter = getOrCreateChapter(db, galleryId, "Highlights", now);
  const filmChapter = getOrCreateChapter(db, galleryId, "Films & broadcasts", now);
  let changed = photoChapter.created || filmChapter.created;
  const existingPhoto = db.prepare("SELECT id FROM media_items WHERE gallery_id = ? AND original_name = ?");
  const existingVideo = db.prepare("SELECT id FROM media_items WHERE gallery_id = ? AND youtube_id = ?");
  const insertPhoto = db.prepare(
    `INSERT INTO media_items
      (id, gallery_id, chapter_id, kind, title, status, position, original_name, mime, size_bytes,
       width, height, preview_path, thumb_path, storage_path, created_at, updated_at)
     VALUES (?, ?, ?, 'photo', ?, 'ready', ?, ?, 'image/jpeg', ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertVideo = db.prepare(
    `INSERT INTO media_items
      (id, gallery_id, chapter_id, kind, title, status, position, mime, size_bytes,
       youtube_id, youtube_url, created_at, updated_at)
     VALUES (?, ?, ?, 'youtube', ?, 'ready', ?, 'text/html', 0, ?, ?, ?, ?)`,
  );
  let position = Number(
    (
      db.prepare("SELECT COALESCE(MAX(position), -1) AS max FROM media_items WHERE gallery_id = ?").get(galleryId) as {
        max: number;
      }
    ).max,
  ) + 1;

  for (const photo of flagshipHighlights) {
    if (existingPhoto.get(galleryId, photo.name)) continue;
    const stem = photo.name.replace(/\.[^.]+$/, "");
    insertPhoto.run(
      stableSeedId(`photo:${galleryId}:${photo.name}`),
      galleryId,
      photoChapter.id,
      stem.replace(/[_-]+/g, " "),
      position++,
      photo.name,
      photo.size,
      photo.width,
      photo.height,
      `bundled/highlights/preview/${photo.preview}`,
      `bundled/highlights/thumb/${photo.thumb}`,
      `bundled/highlights/original/${photo.name}`,
      now,
      now,
    );
    changed = true;
  }

  for (const video of FLAGSHIP_VIDEOS) {
    if (existingVideo.get(galleryId, video.id)) continue;
    insertVideo.run(
      stableSeedId(`youtube:${galleryId}:${video.id}`),
      galleryId,
      filmChapter.id,
      video.title,
      position++,
      video.id,
      `https://www.youtube.com/watch?v=${video.id}`,
      now,
      now,
    );
    changed = true;
  }

  const gallery = db.prepare("SELECT cover_item_id FROM galleries WHERE id = ?").get(galleryId) as
    | { cover_item_id: string | null }
    | undefined;
  if (gallery && !gallery.cover_item_id) {
    const cover = db
      .prepare("SELECT id FROM media_items WHERE gallery_id = ? AND kind = 'photo' AND status = 'ready' ORDER BY position LIMIT 1")
      .get(galleryId) as { id: string } | undefined;
    if (cover) {
      db.prepare("UPDATE galleries SET cover_item_id = ? WHERE id = ?").run(cover.id, galleryId);
      changed = true;
    }
  }
  if (changed) db.prepare("UPDATE galleries SET updated_at = ? WHERE id = ?").run(now, galleryId);
}

export async function seedDatabase(db: DatabaseSync): Promise<void> {
  const adminEmail = process.env.NURAX_ADMIN_EMAIL?.trim().toLowerCase();
  const adminPassword = process.env.NURAX_ADMIN_PASSWORD;
  const studioEmail = process.env.NURAX_STUDIO_EMAIL?.trim().toLowerCase();
  const studioPassword = process.env.NURAX_STUDIO_PASSWORD;
  if (
    !adminEmail ||
    !adminPassword ||
    adminPassword.length < 12 ||
    !studioEmail ||
    !studioPassword ||
    studioPassword.length < 12
  ) {
    console.warn(
      "NURA-X: local demo seed requires NURAX_ADMIN_EMAIL, NURAX_ADMIN_PASSWORD, NURAX_STUDIO_EMAIL, and NURAX_STUDIO_PASSWORD. Use unique passwords of at least 12 characters.",
    );
    return;
  }

  const adminId = randomUUID();
  const studioId = randomUUID();
  const invitedId = randomUUID();
  const galleryId = randomUUID();
  const chapterOne = randomUUID();
  const chapterTwo = randomUUID();
  const inviteToken = randomToken(24);
  const now = SEED_DATE;

  db.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, status, storage_limit_bytes, created_at)
     VALUES (?, ?, ?, 'admin', ?, 'active', ?, ?)`,
  ).run(adminId, adminEmail, "NURA-X Admin", hashPassword(adminPassword), 50 * 1024 ** 3, now);

  db.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, status, storage_limit_bytes, created_at)
     VALUES (?, ?, ?, 'studio', ?, 'active', ?, ?)`,
  ).run(studioId, studioEmail, "NURA-X Studio", hashPassword(studioPassword), 100 * 1024 ** 3, now);

  db.prepare(
    `INSERT INTO users (id, email, name, role, password_hash, status, storage_limit_bytes, invite_token, invite_expires_at, created_at)
     VALUES (?, ?, ?, 'studio', NULL, 'invited', ?, ?, ?, ?)`,
  ).run(
    invitedId,
    "amina@keffilights.studio",
    "Amina Bello",
    50 * 1024 ** 3,
    inviteToken,
    new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
    now,
  );

  db.prepare(
    `INSERT INTO galleries
      (id, studio_id, slug, title, subtitle, description, kind, status, access_mode, password_hash,
       allow_photo_downloads, allow_video_downloads, featured, cover_item_id, expires_at, revoked_at,
       link_version, published_at, created_at, updated_at, view_count, meta_json)
     VALUES (?, ?, ?, ?, ?, ?, 'flagship', 'published', 'open', NULL, 1, 1, 1, NULL, NULL, NULL, 1, ?, ?, ?, 0, ?)`,
  ).run(
    galleryId,
    studioId,
    "intentional-intelligence",
    "Intentional Intelligence",
    "From Digital Trust to Human Flourishing",
    "The 65th Inaugural Lecture of Nasarawa State University, Keffi — delivered by Professor Rashidah Funke Olanrewaju. A study in intelligence with intention, and in trust that is designed rather than assumed.",
    now,
    now,
    now,
    JSON.stringify({
      series: "65th Inaugural Lecture Series of NSUK",
      institution: "Nasarawa State University, Keffi",
      lecturer: "Professor Rashidah Funke Olanrewaju",
      lectureTitle: "Intentional Intelligence",
    }),
  );

  const chapterThree = randomUUID();
  const chapterFour = randomUUID();

  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, 0, ?)").run(
    chapterOne,
    galleryId,
    "The Inaugural Lecturer",
    now,
  );
  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, 1, ?)").run(
    chapterTwo,
    galleryId,
    "The Occasion",
    now,
  );
  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, 2, ?)").run(
    chapterThree,
    galleryId,
    "The Official Banner",
    now,
  );
  db.prepare("INSERT INTO chapters (id, gallery_id, title, position, created_at) VALUES (?, ?, ?, 3, ?)").run(
    chapterFour,
    galleryId,
    "Behind the Work",
    now,
  );

  // Only real photographs supplied for this lecture are used — no placeholders.
  const archive: Array<{ chapter: string; file: string; title: string }> = [
    { chapter: chapterOne, file: "lecturer-portrait.jpg", title: "Professor Rashidah Funke Olanrewaju" },
    { chapter: chapterOne, file: "lecture/15-exhibition.jpg", title: "At the exhibition of her work" },
    { chapter: chapterTwo, file: "lecture/01-front-row.jpg", title: "In the front row" },
    { chapter: chapterTwo, file: "lecture/02-academic-dress.jpg", title: "In full academic dress" },
    { chapter: chapterTwo, file: "lecture/04-council.jpg", title: "Colleagues in council" },
    { chapter: chapterTwo, file: "lecture/05-faculty.jpg", title: "The faculty in attendance" },
    { chapter: chapterTwo, file: "lecture/09-gold-tassels.jpg", title: "Gold tassels of the procession" },
    { chapter: chapterTwo, file: "lecture/10-robes.jpg", title: "Robes of the ceremony" },
    { chapter: chapterTwo, file: "lecture/11-hall-caps.jpg", title: "Keffi in attendance" },
    { chapter: chapterTwo, file: "lecture/12-hall-full.jpg", title: "The hall, full" },
    { chapter: chapterTwo, file: "lecture/13-listening.jpg", title: "Listening closely" },
    { chapter: chapterTwo, file: "lecture/14-profile.jpg", title: "A portrait in profile" },
    { chapter: chapterTwo, file: "lecture/03-moment.jpg", title: "A moment of reflection" },
    { chapter: chapterTwo, file: "lecture/07-guests.jpg", title: "Guests in white and green" },
    { chapter: chapterThree, file: "lecture-banner.jpg", title: "65th Inaugural Lecture — Official Banner" },
    { chapter: chapterFour, file: "lecture/06-film-crew.jpg", title: "The film crew at work" },
    { chapter: chapterFour, file: "lecture/08-digital-trust-lab.jpg", title: "The digital trust lab" },
    { chapter: chapterFour, file: "lecture/16-team.jpg", title: "The team behind the lecture" },
    { chapter: chapterFour, file: "lecture/17-run-of-show.jpg", title: "Reviewing the run of show" },
    { chapter: chapterFour, file: "lecture/18-broadcast.jpg", title: "The broadcast crew" },
    { chapter: chapterFour, file: "lecture/19-framing.jpg", title: "Framing the moment" },
  ];

  let bannerId = "";
  for (const [position, entry] of archive.entries()) {
    const id = await seedPhoto(
      db,
      galleryId,
      entry.chapter,
      entry.file,
      entry.title,
      position,
    );
    if (entry.file === "lecture-banner.jpg") bannerId = id;
  }

  db.prepare("UPDATE galleries SET cover_item_id = ? WHERE id = ?").run(bannerId, galleryId);

  db.prepare(
    `INSERT INTO meta (key, value) VALUES ('seed_version', '2'), ('seeded_at', ?), ('demo_invite_token', ?)`,
  ).run(now, inviteToken);
}
