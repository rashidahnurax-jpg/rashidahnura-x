import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const storage = path.join(root, "storage");
const targets = [
  path.join(storage, "nurax.sqlite"),
  path.join(storage, "nurax.sqlite-wal"),
  path.join(storage, "nurax.sqlite-shm"),
  path.join(storage, "media"),
  path.join(storage, "tmp"),
];

for (const target of targets) {
  if (!target.startsWith(storage + path.sep)) continue;
  fs.rmSync(target, { recursive: true, force: true });
}

fs.mkdirSync(path.join(storage, "media"), { recursive: true });
fs.mkdirSync(path.join(storage, "tmp"), { recursive: true });

console.log("Seed data cleared. The next request rebuilds the database and re-seeds the flagship gallery.");
