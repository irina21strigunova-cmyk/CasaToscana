import { NextResponse } from "next/server";
import { isEmailConfigured } from "@/lib/email/send";
import { isDurableStoreConfigured, unpaidOrdersEnabled } from "@/lib/orders/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({
    ok: true,
    durableStore: isDurableStoreConfigured(),
    unpaidOrders: unpaidOrdersEnabled(),
    email: isEmailConfigured(),
  });
}
