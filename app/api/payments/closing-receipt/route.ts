import { NextResponse } from "next/server";
import {
  findOrderByPaymentId,
  getOrderByOrderId,
  getPaymentIdByOrderId,
  rememberPaymentMapping,
  updateOrderByOrderId,
} from "@/lib/orders/store";
import { authorizeOpsRequest } from "@/lib/tbank/ops-auth";
import { getPaymentState, sendClosingReceipt } from "@/lib/tbank/client";
import {
  applyShipmentMarkCodes,
  isUsableMarkCode,
  type ShipmentMarkCode,
} from "@/lib/tbank/receipt";
import {
  isFailedPaymentStatus,
  isRefundedPaymentStatus,
} from "@/lib/tbank/types";
import type { TbankMarkCodeType } from "@/types/product";

export const runtime = "nodejs";

const MARK_CODE_TYPES: TbankMarkCodeType[] = [
  "UNKNOWN",
  "EAN8",
  "EAN13",
  "ITF14",
  "GS10",
  "GS1M",
  "SHORT",
  "FUR",
  "EGAIS20",
  "EGAIS30",
  "RAWCODE",
];

interface ClosingReceiptBody {
  orderId?: string;
  paymentId?: string;
  shippedAt?: string;
  /** Only for items wrongly flagged as marked; never a substitute for real codes. */
  allowUnmarked?: boolean;
  markCodes?: Array<{
    productId?: string;
    markCodeType?: string;
    value?: string;
  }>;
}

function parseMarkCodes(
  raw: ClosingReceiptBody["markCodes"]
): ShipmentMarkCode[] {
  if (!raw?.length) return [];
  const parsed: ShipmentMarkCode[] = [];
  for (const item of raw) {
    const productId = item.productId?.trim();
    const value = item.value?.trim();
    const markCodeType = MARK_CODE_TYPES.includes(
      item.markCodeType as TbankMarkCodeType
    )
      ? (item.markCodeType as TbankMarkCodeType)
      : null;
    if (!productId || !value || !markCodeType) {
      throw new Error(
        "Каждый код маркировки должен содержать productId, markCodeType и value"
      );
    }
    if (!isUsableMarkCode(value)) {
      throw new Error(
        "Код маркировки похож на заглушку или слишком короткий — передайте реальный код Честного знака"
      );
    }
    parsed.push({ productId, markCodeType, value });
  }
  return parsed;
}

/**
 * Send the FFD 1.2 closing cheque after actual handover/shipment.
 * Init used PaymentMethod=full_prepayment; this cheque is full_payment
 * with AdvancePayment equal to the prepaid amount.
 */
export async function POST(request: Request) {
  const unauthorized = authorizeOpsRequest(request);
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as ClosingReceiptBody;
    const orderId = body.orderId?.trim() || null;
    const paymentIdParam = body.paymentId?.trim() || null;
    const markCodes = parseMarkCodes(body.markCodes);

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

    if (!order) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Заказ не найден локально — без состава заказа закрывающий чек не сформировать",
        },
        { status: 404 }
      );
    }

    const paymentId =
      paymentIdParam ||
      order.paymentId ||
      getPaymentIdByOrderId(order.orderId);

    if (!paymentId) {
      return NextResponse.json(
        { ok: false, error: "Не найден PaymentId заказа" },
        { status: 404 }
      );
    }

    if (order.closingReceiptSentAt) {
      return NextResponse.json({
        ok: true,
        alreadySent: true,
        orderId: order.orderId,
        paymentId,
        closingReceiptSentAt: order.closingReceiptSentAt,
      });
    }

    const state = await getPaymentState(paymentId);
    if (state.OrderId) {
      rememberPaymentMapping(String(state.OrderId), paymentId);
    }

    if (isRefundedPaymentStatus(state.Status) || order.refundedAt) {
      return NextResponse.json(
        { ok: false, error: "По заказу уже оформлен возврат" },
        { status: 409 }
      );
    }

    if (isFailedPaymentStatus(state.Status)) {
      return NextResponse.json(
        { ok: false, error: "Платёж неуспешен — закрывающий чек недоступен" },
        { status: 409 }
      );
    }

    if (state.Status !== "CONFIRMED") {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Закрывающий чек можно отправить только после статуса CONFIRMED",
          status: state.Status ?? null,
        },
        { status: 409 }
      );
    }

    const shipment = applyShipmentMarkCodes(order.lines, markCodes);
    if (shipment.unmarkedRequired > 0 && body.allowUnmarked !== true) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Для маркируемых позиций нужны реальные коды Честного знака. Передайте markCodes или allowUnmarked=true, если товар не маркируется.",
          unmarkedRequiredUnits: shipment.unmarkedRequired,
        },
        { status: 409 }
      );
    }

    const now = new Date().toISOString();
    const shippedAt = body.shippedAt?.trim() || order.shippedAt || now;

    const result = await sendClosingReceipt({
      paymentId,
      customer: order.customer,
      lines: shipment.lines,
      amountKopecks: order.amountKopecks,
    });

    if (!result.Success) {
      return NextResponse.json(
        {
          ok: false,
          error:
            result.Message ||
            result.Details ||
            "Не удалось отправить закрывающий чек",
          errorCode: result.ErrorCode,
        },
        { status: 502 }
      );
    }

    updateOrderByOrderId(order.orderId, {
      paymentId,
      lines: shipment.lines,
      shippedAt,
      closingReceiptSentAt: now,
    });

    return NextResponse.json({
      ok: true,
      orderId: order.orderId,
      paymentId,
      shippedAt,
      closingReceiptSentAt: now,
      markingIncomplete: shipment.unmarkedRequired > 0,
      unmarkedRequiredUnits: shipment.unmarkedRequired,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка закрывающего чека";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
