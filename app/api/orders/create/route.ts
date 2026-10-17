import { NextResponse } from "next/server";
import { parseDeliveryType, quoteDelivery } from "@/lib/cdek/quote";
import { notifyNewOrder } from "@/lib/email/send";
import type { CdekDeliveryType } from "@/lib/cdek/types";
import {
  calculateOrderFromCartItems,
  createOrderId,
  type CheckoutCustomer,
} from "@/lib/orders/calculate";
import {
  savePendingOrder,
  unpaidOrdersEnabled,
} from "@/lib/orders/store";
import { goodsRubFromLines } from "@/lib/orders/types";
import type { CartItem } from "@/types/product";

export const runtime = "nodejs";

interface CreateOrderBody {
  items?: CartItem[];
  customer?: Partial<CheckoutCustomer>;
  delivery?: {
    type?: CdekDeliveryType;
    cityCode?: number;
    cityName?: string;
    cityRegion?: string;
    officeCode?: string;
    address?: string;
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

/**
 * Save an unpaid order when CDEK cannot quote because catalog weights
 * are missing. Requires durable Supabase storage. Does not call T-Bank Init.
 */
export async function POST(request: Request) {
  try {
    if (!unpaidOrdersEnabled()) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Оформление без оплаты недоступно: не подключено постоянное хранилище заказов.",
        },
        { status: 503 }
      );
    }

    const body = (await request.json()) as CreateOrderBody;
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

    if (!quote.delivery.awaitingQuote) {
      throw new Error(
        "Для этого заказа доставка уже рассчитана — оплатите его через форму оплаты"
      );
    }

    const orderCalc = calculateOrderFromCartItems(items, {
      ...quote.delivery,
      costRub: 0,
      awaitingQuote: true,
    });
    const orderId = createOrderId();

    const saved = await savePendingOrder({
      orderId,
      amountKopecks: orderCalc.amountKopecks,
      totalRub: orderCalc.totalRub,
      goodsRub: goodsRubFromLines(orderCalc.lines),
      lines: orderCalc.lines,
      customer,
      delivery: quote.delivery,
      status: "AWAITING_DELIVERY_QUOTE",
    });

    const mail = await notifyNewOrder(saved);

    return NextResponse.json({
      ok: true,
      orderId,
      status: "AWAITING_DELIVERY_QUOTE",
      statusLabel: "Ожидает расчёта доставки",
      goodsRub: orderCalc.goodsRub,
      email: {
        admin: mail.admin.sent,
        buyer: mail.buyer.sent,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось оформить заказ";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
