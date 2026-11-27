import { db, get, ready } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { randomToken } from "@/lib/password";
import { jsonError, jsonOk, sameOrigin } from "@/lib/http";
import type { UserRow } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  await ready();
  const admin = await getCurrentUser();
  if (!admin || admin.role !== "admin") return jsonError("Not authorised", 403);

  const { id } = await params;
  const studio = get<UserRow>("SELECT * FROM users WHERE id = ? AND role = 'studio'", id);
  if (!studio) return jsonError("Studio not found", 404);
  if (studio.status !== "invited") return jsonError("Only pending invitations can be resent.", 400);

  const token = randomToken(24);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare("UPDATE users SET invite_token = ?, invite_expires_at = ? WHERE id = ?").run(token, expiresAt, id);

  return jsonOk({ invitePath: `/invite/${token}`, expiresAt });
}
