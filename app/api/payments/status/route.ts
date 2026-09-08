import { NextResponse } from "next/server";
import {
  findOrderByPaymentId,
  getOrderByOrderId,
  getPaymentIdByOrderId,
  rememberPaymentMapping,
} from "@/lib/orders/store";
import { checkOrder, getPaymentState } from "@/lib/tbank/client";
import {
  classifyPaymentStatus,
  type TbankCheckOrderPayment,
} from "@/lib/tbank/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function noStoreJson(body: unknown, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

function logTbankStatus(input: {
  orderId: string | null;
  paymentId: string | null;
  status: string | null | undefined;
  Success: boolean | undefined;
  ErrorCode: string | null | undefined;
  Message: string | null | undefined;
  Details: string | null | undefined;
}) {
  console.info("[tbank-status]", {
    orderId: input.orderId,
    paymentId: input.paymentId,
    status: input.status ?? null,
    Success: input.Success ?? null,
    ErrorCode: input.ErrorCode ?? null,
    Message: input.Message ?? null,
    Details: input.Details ?? null,
  });
}

function pickPayment(
  payments: TbankCheckOrderPayment[] | undefined
): TbankCheckOrderPayment | undefined {
  if (!payments?.length) return undefined;
  const paid = [...payments]
    .reverse()
    .find(
      (payment) =>
        payment.Status === "CONFIRMED" || payment.Status === "AUTHORIZED"
    );
  return paid ?? payments[payments.length - 1];
}

/**
 * Confirms payment status via T-Bank CheckOrder / GetState (server-side).
 * Cart must be cleared only when this reports paid=true.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId")?.trim() || null;
    const paymentIdParam = searchParams.get("paymentId")?.trim() || null;

    if (!orderId && !paymentIdParam) {
      return noStoreJson(
        { ok: false, error: "Нужен orderId или paymentId" },
        400
      );
    }

    const local = orderId
      ? getOrderByOrderId(orderId)
      : paymentIdParam
        ? findOrderByPaymentId(paymentIdParam)
        : undefined;

    let paymentId =
      paymentIdParam ||
      local?.paymentId ||
      (orderId ? getPaymentIdByOrderId(orderId) : undefined) ||
      null;

    if (!paymentId && orderId) {
      const checked = await checkOrder(orderId);
      const payment = pickPayment(checked.Payments);
      const resolved = payment?.PaymentId != null ? String(payment.PaymentId) : null;

      logTbankStatus({
        orderId: checked.OrderId ?? orderId,
        paymentId: resolved,
        status: payment?.Status,
        Success: checked.Success,
        ErrorCode: payment?.ErrorCode ?? checked.ErrorCode,
        Message: payment?.Message ?? checked.Message,
        Details: payment?.Details ?? checked.Details,
      });

      if (resolved) {
        paymentId = resolved;
        rememberPaymentMapping(orderId, resolved);
      }
    }

    if (!paymentId) {
      logTbankStatus({
        orderId,
        paymentId: null,
        status: local?.status ?? "UNKNOWN",
        Success: undefined,
        ErrorCode: null,
        Message: "PaymentId not resolved",
        Details: null,
      });
      return noStoreJson({
        ok: true,
        paid: false,
        outcome: "pending",
        orderId,
        paymentId: null,
        status: local?.status ?? "UNKNOWN",
        source: "local",
      });
    }

    const state = await getPaymentState(paymentId);
    if (orderId || state.OrderId) {
      rememberPaymentMapping(String(state.OrderId ?? orderId), String(state.PaymentId ?? paymentId));
    }

    logTbankStatus({
      orderId: state.OrderId != null ? String(state.OrderId) : orderId,
      paymentId: String(state.PaymentId ?? paymentId),
      status: state.Status,
      Success: state.Success,
      ErrorCode: state.ErrorCode,
      Message: state.Message,
      Details: state.Details,
    });

    const outcome = classifyPaymentStatus(state.Status);
    const paid = outcome === "paid";

    return noStoreJson({
      ok: true,
      paid,
      outcome,
      orderId: state.OrderId ?? local?.orderId ?? orderId,
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
    return noStoreJson({ ok: false, error: message }, 500);
  }
}
