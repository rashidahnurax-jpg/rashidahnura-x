import { db, get, nowIso, ready } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { jsonError, jsonOk, readJson, safeText, sameOrigin } from "@/lib/http";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return jsonError("Not authorised", 403);

  const { id } = await params;
  const studio = get<UserRow>("SELECT * FROM users WHERE id = ? AND role = 'studio'", id);
  if (!studio) return jsonError("Studio not found", 404);

  const body = await readJson<{ name?: string; status?: string; storageGb?: number }>(req);
  if (!body) return jsonError("Invalid request", 400);

  const updates: string[] = [];
  const values: unknown[] = [];

  if (body.name !== undefined) {
    const name = safeText(body.name, 90);
    if (!name) return jsonError("Studio name cannot be empty.", 400);
    updates.push("name = ?");
    values.push(name);
  }

  if (body.storageGb !== undefined) {
    const gb = Number(body.storageGb);
    if (!Number.isFinite(gb) || gb < 1 || gb > 2000) return jsonError("Storage limit must be 1–2000 GB.", 400);
    updates.push("storage_limit_bytes = ?");
    values.push(Math.round(gb * 1024 ** 3));
  }

  if (body.status !== undefined) {
    if (studio.status === "invited") return jsonError("This studio has not accepted its invitation yet.", 400);
    if (!["active", "suspended"].includes(body.status)) return jsonError("Unknown status", 400);
    updates.push("status = ?");
    values.push(body.status);
    if (body.status === "suspended") {
      db.prepare("DELETE FROM sessions WHERE user_id = ?").run(studio.id);
    }
  }

  if (!updates.length) return jsonError("Nothing to update.", 400);
  updates.push("last_seen_at = last_seen_at");
  db.prepare(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`).run(...(values as never[]), studio.id);
  return jsonOk({ updatedAt: nowIso() });
}
