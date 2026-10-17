import { NextResponse } from "next/server";
import { notifyPaymentLink } from "@/lib/email/send";
import { attachDeliveryLine } from "@/lib/orders/calculate";
import {
  claimOrderForPayment,
  releasePaymentClaim,
  updateOrderByOrderId,
} from "@/lib/orders/store";
import { initPayment } from "@/lib/tbank/client";
import { authorizeOpsRequest } from "@/lib/tbank/ops-auth";

export const runtime = "nodejs";

interface ConfirmDeliveryBody {
  orderId?: string;
  deliveryCostRub?: number;
}

/**
 * Ops-only: set a confirmed CDEK or Yandex delivery price on an unpaid order
 * and create a T-Bank payment link (goods + delivery).
 */
export async function POST(request: Request) {
  const unauthorized = authorizeOpsRequest(request);
  if (unauthorized) return unauthorized;

  let claimedOrderId: string | null = null;

  try {
    const body = (await request.json()) as ConfirmDeliveryBody;
    const orderId = body.orderId?.trim();
    const deliveryCostRub = body.deliveryCostRub;

    if (!orderId) {
      throw new Error("Нужен orderId");
    }
    if (
      typeof deliveryCostRub !== "number" ||
      !Number.isFinite(deliveryCostRub) ||
      deliveryCostRub < 0 ||
      deliveryCostRub > 1_000_000
    ) {
      throw new Error("Укажите подтверждённую стоимость доставки в рублях");
    }

    const claim = await claimOrderForPayment(orderId);
    if (!claim.ok) {
      const message =
        claim.reason === "not_found"
          ? "Заказ не найден"
          : claim.reason === "paid"
            ? "Заказ уже оплачен"
            : claim.reason === "locked"
              ? "По заказу уже создаётся платёж"
              : "Ссылку на оплату можно создать только для заказа в статусе «Ожидает расчёта доставки»";
      const status = claim.reason === "not_found" ? 404 : 409;
      return NextResponse.json({ ok: false, error: message }, { status });
    }

    if (claim.existing && claim.order.paymentUrl) {
      return NextResponse.json({
        ok: true,
        restored: true,
        orderId: claim.order.orderId,
        paymentId: claim.order.paymentId ?? null,
        amountKopecks: claim.order.amountKopecks,
        totalRub: claim.order.totalRub,
        deliveryCostRub: claim.order.delivery?.costRub ?? 0,
        paymentUrl: claim.order.paymentUrl,
      });
    }

    claimedOrderId = orderId;
    const order = claim.order;
    if (!order.delivery || order.delivery.type === "stavropol_local") {
      await releasePaymentClaim(orderId);
      claimedOrderId = null;
      return NextResponse.json(
        { ok: false, error: "У заказа нет доставки, ожидающей расчёта" },
        { status: 409 }
      );
    }

    const costRub = Math.round(deliveryCostRub * 100) / 100;
    const delivery = {
      ...order.delivery,
      costRub,
      awaitingQuote: false,
    };
    const recalculated = attachDeliveryLine(order.lines, delivery);

    const init = await initPayment({
      amountKopecks: recalculated.amountKopecks,
      orderId: order.orderId,
      description: `Casa Toscana · заказ ${order.orderId}`,
      customer: order.customer,
      lines: recalculated.lines,
    });

    if (!init.Success || !init.PaymentURL) {
      await releasePaymentClaim(orderId);
      claimedOrderId = null;
      return NextResponse.json(
        {
          ok: false,
          error:
            init.Message ||
            init.Details ||
            "Не удалось создать платёж в Т-Банке",
          errorCode: init.ErrorCode,
          orderId: order.orderId,
        },
        { status: 502 }
      );
    }

    const paymentId = String(init.PaymentId ?? "");
    const updated = await updateOrderByOrderId(
      order.orderId,
      {
        delivery,
        lines: recalculated.lines,
        totalRub: recalculated.totalRub,
        amountKopecks: recalculated.amountKopecks,
        goodsRub: recalculated.goodsRub,
        paymentId,
        paymentUrl: init.PaymentURL,
        status: init.Status ?? "NEW",
      },
      "tbank-init"
    );
    claimedOrderId = null;

    if (updated?.paymentUrl) {
      await notifyPaymentLink(updated);
    }

    return NextResponse.json({
      ok: true,
      orderId: order.orderId,
      paymentId,
      amountKopecks: recalculated.amountKopecks,
      totalRub: recalculated.totalRub,
      deliveryCostRub: costRub,
      paymentUrl: init.PaymentURL,
    });
  } catch (error) {
    if (claimedOrderId) {
      try {
        await releasePaymentClaim(claimedOrderId);
      } catch (releaseError) {
        console.error("[confirm-delivery] release failed", releaseError);
      }
    }
    const message =
      error instanceof Error ? error.message : "Не удалось создать ссылку на оплату";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
