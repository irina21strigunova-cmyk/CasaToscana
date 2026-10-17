import { NextResponse } from "next/server";
import {
  createOpsSessionCookie,
  opsCookieHeader,
} from "@/lib/admin/session";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!process.env.TBANK_OPS_SECRET?.trim()) {
    return NextResponse.json(
      { ok: false, error: "Не задан TBANK_OPS_SECRET" },
      { status: 503 }
    );
  }

  const body = (await request.json()) as { secret?: string };
  const token = createOpsSessionCookie(body.secret?.trim() ?? "");
  if (!token) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const response = NextResponse.json({ ok: true });
  response.headers.set("Set-Cookie", opsCookieHeader(token));
  return response;
}
