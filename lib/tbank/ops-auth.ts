import { NextResponse } from "next/server";
import { isOpsAuthorized } from "@/lib/admin/session";

/**
 * Protects refund / closing-receipt / confirm-delivery / admin order routes.
 * Set TBANK_OPS_SECRET in the environment; send it as
 * `Authorization: Bearer …`, `x-ops-secret`, or an HttpOnly ops cookie.
 */
export function authorizeOpsRequest(request: Request): NextResponse | null {
  const secret = process.env.TBANK_OPS_SECRET?.trim();
  if (!secret) {
    return NextResponse.json(
      { ok: false, error: "Не задан TBANK_OPS_SECRET" },
      { status: 503 }
    );
  }

  if (!isOpsAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  return null;
}
