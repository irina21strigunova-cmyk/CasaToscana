import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";

function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

/**
 * Protects refund / closing-receipt routes.
 * Set TBANK_OPS_SECRET in the environment; send it as
 * `Authorization: Bearer …` or `x-ops-secret`.
 */
export function authorizeOpsRequest(request: Request): NextResponse | null {
  const secret = process.env.TBANK_OPS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Не задан TBANK_OPS_SECRET" },
      { status: 503 }
    );
  }

  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const provided = bearer || request.headers.get("x-ops-secret")?.trim() || "";

  if (!provided || !secretsEqual(provided, secret)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
