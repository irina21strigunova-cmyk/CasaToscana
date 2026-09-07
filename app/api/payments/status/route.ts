import { NextResponse } from "next/server";
import { findOrderByPaymentId, getOrderByOrderId } from "@/lib/orders/store";
import { getPaymentState } from "@/lib/tbank/client";
import { isSuccessfulPaymentStatus } from "@/lib/tbank/types";

export const runtime = "nodejs";

/**
 * Confirms payment status via T-Bank GetState (server-side).
 * Cart must be cleared only when this reports paid=true.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId")?.trim();
    const paymentIdParam = searchParams.get("paymentId")?.trim();

    if (!orderId && !paymentIdParam) {
      return NextResponse.json(
        { ok: false, error: "Нужен orderId или paymentId" },
        { status: 400 }
      );
    }

    const local = orderId
      ? getOrderByOrderId(orderId)
      : paymentIdParam
        ? findOrderByPaymentId(paymentIdParam)
        : undefined;
    const paymentId = paymentIdParam || local?.paymentId;

    if (!paymentId) {
      return NextResponse.json({
        ok: true,
        paid: false,
        orderId: orderId ?? null,
        status: local?.status ?? "UNKNOWN",
        source: "local",
      });
    }

    const state = await getPaymentState(paymentId);
    const paid =
      state.Success && isSuccessfulPaymentStatus(state.Status);

    return NextResponse.json({
      ok: true,
      paid,
      orderId: state.OrderId ?? local?.orderId ?? orderId ?? null,
      paymentId: String(state.PaymentId ?? paymentId),
      status: state.Status ?? null,
      amountKopecks: state.Amount ?? local?.amountKopecks ?? null,
      source: "tbank",
      bankSuccess: state.Success,
      errorCode: state.ErrorCode,
      message: state.Message ?? null,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка проверки статуса";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
