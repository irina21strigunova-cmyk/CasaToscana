import { NextResponse } from "next/server";
import {
  findOrderByPaymentId,
  getOrderByOrderId,
  getPaymentIdByOrderId,
  rememberPaymentMapping,
  updateOrderByOrderId,
} from "@/lib/orders/store";
import { authorizeOpsRequest } from "@/lib/tbank/ops-auth";
import { cancelPayment, getPaymentState } from "@/lib/tbank/client";
import { isRefundedPaymentStatus } from "@/lib/tbank/types";

export const runtime = "nodejs";

interface RefundBody {
  orderId?: string;
  paymentId?: string;
}

/**
 * Full refund / cancel via T-Bank Cancel.
 * Receipt is intentionally omitted: on a full cancel the kassa builds
 * the return cheque from the original Init receipt.
 */
export async function POST(request: Request) {
  const unauthorized = authorizeOpsRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as RefundBody;
    const orderId = body.orderId?.trim() || null;
    const paymentIdParam = body.paymentId?.trim() || null;

    if (!orderId && !paymentIdParam) {
      return NextResponse.json(
        { ok: false, error: "Нужен orderId или paymentId" },
        { status: 400 }
      );
    }

    const order = orderId
      ? getOrderByOrderId(orderId)
      : paymentIdParam
        ? findOrderByPaymentId(paymentIdParam)
        : undefined;

    const paymentId =
      paymentIdParam ||
      order?.paymentId ||
      (orderId ? getPaymentIdByOrderId(orderId) : undefined);

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "Не найден PaymentId заказа" },
        { status: 404 }
      );
    }

    const state = await getPaymentState(paymentId);
    if (state.OrderId) {
      rememberPaymentMapping(String(state.OrderId), paymentId);
    }

    if (isRefundedPaymentStatus(state.Status)) {
      if (order) {
        updateOrderByOrderId(order.orderId, {
          status: "REFUNDED",
          refundedAt: order.refundedAt ?? new Date().toISOString(),
        });
      }
      return NextResponse.json({
        ok: true,
        alreadyRefunded: true,
        orderId: state.OrderId ?? order?.orderId ?? orderId,
        paymentId,
        status: state.Status,
      });
    }

    const cancel = await cancelPayment({
      paymentId,
    });

    if (!cancel.Success) {
      return NextResponse.json(
        {
          ok: false,
          error: cancel.Message || cancel.Details || "Не удалось оформить возврат",
          errorCode: cancel.ErrorCode,
          status: cancel.Status ?? null,
        },
        { status: 502 }
      );
    }

    const refunded = isRefundedPaymentStatus(cancel.Status) ||
      cancel.Status === "REVERSED" ||
      cancel.Status === "CANCELED";

    if (order) {
      updateOrderByOrderId(order.orderId, {
        paymentId,
        status: refunded ? "REFUNDED" : cancel.Status ?? order.status,
        refundedAt: refunded ? new Date().toISOString() : order.refundedAt,
      });
    }

    return NextResponse.json({
      ok: true,
      orderId: cancel.OrderId ?? order?.orderId ?? orderId,
      paymentId: String(cancel.PaymentId ?? paymentId),
      status: cancel.Status ?? null,
      amountKopecks: cancel.Amount ?? order?.amountKopecks ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка возврата";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
