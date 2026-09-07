import { NextResponse } from "next/server";
import {
  findOrderByPaymentId,
  getOrderByOrderId,
  updateOrderByOrderId,
} from "@/lib/orders/store";
import { getTbankConfig } from "@/lib/tbank/client";
import { verifyTbankToken } from "@/lib/tbank/token";
import { isSuccessfulPaymentStatus } from "@/lib/tbank/types";

export const runtime = "nodejs";

/**
 * T-Bank payment notification webhook.
 * Must respond with plain text "OK" and HTTP 200 on success.
 * @see https://developer.tbank.ru/eacq/intro/developer/notification
 */
export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as Record<string, unknown>;
    const { password } = getTbankConfig();

    if (!verifyTbankToken(payload, password)) {
      return new NextResponse("Invalid token", { status: 403 });
    }

    const orderId =
      typeof payload.OrderId === "string" ? payload.OrderId : undefined;
    const paymentId =
      payload.PaymentId != null ? String(payload.PaymentId) : undefined;
    const status =
      typeof payload.Status === "string" ? payload.Status : undefined;

    const order =
      (orderId ? getOrderByOrderId(orderId) : undefined) ??
      (paymentId ? findOrderByPaymentId(paymentId) : undefined);

    if (order) {
      const paid = isSuccessfulPaymentStatus(status);
      updateOrderByOrderId(order.orderId, {
        paymentId: paymentId ?? order.paymentId,
        status: paid ? "PAID" : status || order.status,
        paidAt: paid ? new Date().toISOString() : order.paidAt,
      });
    }

    return new NextResponse("OK", {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  } catch {
    return new NextResponse("Error", { status: 500 });
  }
}
