import { NextResponse } from "next/server";
import { opsCookieHeader } from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", opsCookieHeader("", true));
  return response;
}
