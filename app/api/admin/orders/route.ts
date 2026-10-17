import { NextResponse } from "next/server";
import {
  getOrderByOrderId,
  listOrders,
  orderStatusLabel,
} from "@/lib/orders/store";
import { deliveryCostFromRecord } from "@/lib/orders/types";
import { authorizeOpsRequest } from "@/lib/tbank/ops-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function serialize(order: Awaited<ReturnType<typeof getOrderByOrderId>>) {
  if (!order) return null;
  return {
    orderId: order.orderId,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    customer: order.customer,
    lines: order.lines,
    delivery: order.delivery,
    goodsRub: order.goodsRub,
    deliveryCostRub: deliveryCostFromRecord(order),
    totalRub: order.totalRub,
    amountKopecks: order.amountKopecks,
    paymentId: order.paymentId ?? null,
    paymentUrl: order.paymentUrl ?? null,
    paidAt: order.paidAt ?? null,
    history: order.history ?? [],
  };
}

export async function GET(request: Request) {
  const unauthorized = authorizeOpsRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId")?.trim();
    if (orderId) {
      const order = await getOrderByOrderId(orderId);
      if (!order) {
        return NextResponse.json(
          { ok: false, error: "Заказ не найден" },
          { status: 404 }
        );
      }
      return NextResponse.json({ ok: true, order: serialize(order) });
    }

    const orders = await listOrders(100);
    return NextResponse.json({
      ok: true,
      orders: orders.map((order) => serialize(order)),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить заказы";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
