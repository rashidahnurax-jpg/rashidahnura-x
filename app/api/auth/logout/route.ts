import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";
import { sameOrigin, jsonError } from "@/lib/http";

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!sameOrigin(req)) return jsonError("Invalid origin", 403);
  const res = NextResponse.json({ ok: true });
  res.cookies.set({ name: SESSION_COOKIE, value: "", path: "/", maxAge: 0 });
  return res;
}
