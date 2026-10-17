import { NextResponse } from "next/server";
import { parseDeliveryType, quoteDelivery } from "@/lib/cdek/quote";
import type { CdekDeliveryType } from "@/lib/cdek/types";
import {
  calculateOrderFromCartItems,
  createOrderId,
  type CheckoutCustomer,
} from "@/lib/orders/calculate";
import { notifyNewOrder } from "@/lib/email/send";
import {
  rememberPaymentMapping,
  savePendingOrder,
  updateOrderByOrderId,
} from "@/lib/orders/store";
import { goodsRubFromLines } from "@/lib/orders/types";
import { initPayment } from "@/lib/tbank/client";
import type { CartItem } from "@/types/product";

export const runtime = "nodejs";

interface CreatePaymentBody {
  items?: CartItem[];
  customer?: Partial<CheckoutCustomer>;
  delivery?: {
    type?: CdekDeliveryType;
    cityCode?: number;
    cityName?: string;
    cityRegion?: string;
    officeCode?: string;
    address?: string;
    expectedCostRub?: number;
  };
}

function normalizeCustomer(
  customer: Partial<CheckoutCustomer> | undefined
): CheckoutCustomer {
  const name = customer?.name?.trim() ?? "";
  const phone = customer?.phone?.trim() ?? "";
  const email = customer?.email?.trim() ?? "";
  const comment = customer?.comment?.trim() || undefined;

  if (name.length < 2) {
    throw new Error("Укажите имя");
  }
  if (phone.replace(/\D/g, "").length < 10) {
    throw new Error("Укажите корректный телефон");
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("Укажите корректный email");
  }

  return { name, phone, email, comment };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CreatePaymentBody;
    const customer = normalizeCustomer(body.customer);
    const items = body.items ?? [];
    const deliveryType = parseDeliveryType(body.delivery?.type);
    if (!deliveryType) {
      throw new Error("Выберите способ доставки");
    }

    const quote = await quoteDelivery({
      type: deliveryType,
      cityCode: body.delivery?.cityCode,
      cityName: body.delivery?.cityName,
      cityRegion: body.delivery?.cityRegion,
      officeCode: body.delivery?.officeCode,
      address: body.delivery?.address,
      items,
    });

    if (quote.delivery.awaitingQuote) {
      throw new Error(
        "Стоимость доставки ещё не рассчитана. Оформите заказ без оплаты или дождитесь расчёта."
      );
    }

    const expected = body.delivery?.expectedCostRub;
    if (
      typeof expected === "number" &&
      Math.abs(expected - quote.delivery.costRub) > 1
    ) {
      throw new Error(
        "Стоимость доставки изменилась. Обновите расчёт перед оплатой."
      );
    }

    const order = calculateOrderFromCartItems(items, quote.delivery);
    const orderId = createOrderId();

    await savePendingOrder({
      orderId,
      amountKopecks: order.amountKopecks,
      totalRub: order.totalRub,
      goodsRub: goodsRubFromLines(order.lines),
      lines: order.lines,
      customer,
      delivery: quote.delivery,
      status: "PENDING",
    });

    const init = await initPayment({
      amountKopecks: order.amountKopecks,
      orderId,
      description: `Casa Toscana · заказ ${orderId}`,
      customer,
      lines: order.lines,
    });

    if (!init.Success || !init.PaymentURL) {
      await updateOrderByOrderId(orderId, { status: "FAILED" }, "tbank-init-failed");
      return NextResponse.json(
        {
          ok: false,
          error:
            init.Message ||
            init.Details ||
            "Не удалось создать платёж в Т-Банке",
          errorCode: init.ErrorCode,
          orderId,
        },
        { status: 502 }
      );
    }

    const paymentId = String(init.PaymentId ?? "");
    const saved = await updateOrderByOrderId(
      orderId,
      {
        paymentId,
        paymentUrl: init.PaymentURL,
        status: init.Status ?? "NEW",
      },
      "tbank-init"
    );
    if (paymentId) {
      await rememberPaymentMapping(orderId, paymentId);
    }
    if (saved) {
      await notifyNewOrder(saved);
    }

    return NextResponse.json({
      ok: true,
      orderId,
      paymentId,
      amountKopecks: order.amountKopecks,
      totalRub: order.totalRub,
      paymentUrl: init.PaymentURL,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Ошибка создания платежа";
    const diagnostics =
      error &&
      typeof error === "object" &&
      "diagnostics" in error &&
      error.diagnostics &&
      typeof error.diagnostics === "object"
        ? (error.diagnostics as {
            name: string | null;
            message: string | null;
            causeCode: string | null;
            causeMessage: string | null;
          })
        : null;

    if (diagnostics) {
      console.error("[payments/create fetch diagnostics]", {
        name: diagnostics.name,
        message: diagnostics.message,
        causeCode: diagnostics.causeCode,
        causeMessage: diagnostics.causeMessage,
      });
    }

    return NextResponse.json(
      {
        ok: false,
        error: message,
        diagnostics: diagnostics
          ? {
              name: diagnostics.name,
              message: diagnostics.message,
              causeCode: diagnostics.causeCode,
              causeMessage: diagnostics.causeMessage,
            }
          : null,
      },
      { status: 400 }
    );
  }
}
