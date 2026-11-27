import { randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { hashPassword } from "./password";
import { randomToken } from "./password";
import { buildPhotoDerivatives, itemDir, relativeMediaPath } from "./storage";

const SEED_DATE = new Date().toISOString();

async function seedPhoto(
  db: DatabaseSync,
  galleryId: string,
  chapterId: string,
  sourceRelative: string,
  title: string,
  position: number,
): Promise<string> {
  const id = randomUUID();
  const dir = itemDir(galleryId, id);
  fs.mkdirSync(dir, { recursive: true });
  const extension = path.extname(sourceRelative) || ".jpg";
  const originalAbs = path.join(dir, `original${extension}`);
  fs.copyFileSync(path.join(process.cwd(), sourceRelative), originalAbs);
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
      path.join("assets", "seed", entry.file),
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
