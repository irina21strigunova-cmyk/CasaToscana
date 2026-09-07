import { NextResponse } from "next/server";
import {
  calculateOrderFromCartItems,
  createOrderId,
  type CheckoutCustomer,
} from "@/lib/orders/calculate";
import { savePendingOrder, updateOrderByOrderId } from "@/lib/orders/store";
import { initPayment } from "@/lib/tbank/client";
import type { CartItem } from "@/types/product";

export const runtime = "nodejs";

interface CreatePaymentBody {
  items?: CartItem[];
  customer?: Partial<CheckoutCustomer>;
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
    const order = calculateOrderFromCartItems(body.items ?? []);
    const orderId = createOrderId();

    savePendingOrder({
      orderId,
      amountKopecks: order.amountKopecks,
      totalRub: order.totalRub,
      lines: order.lines,
      customer,
      status: "PENDING",
    });

    const init = await initPayment({
      amountKopecks: order.amountKopecks,
      orderId,
      description: `Casa Toscana · заказ ${orderId}`,
      customerEmail: customer.email,
      customerPhone: customer.phone,
    });

    if (!init.Success || !init.PaymentURL) {
      updateOrderByOrderId(orderId, { status: "FAILED" });
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
    updateOrderByOrderId(orderId, {
      paymentId,
      status: init.Status ?? "NEW",
    });

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
