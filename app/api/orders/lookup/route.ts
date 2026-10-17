import { NextResponse } from "next/server";
import { getOrderByOrderIdAndEmail } from "@/lib/orders/store";
import { publicOrderView } from "@/lib/orders/types";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      orderId?: string;
      email?: string;
    };
    const orderId = body.orderId?.trim() ?? "";
    const email = body.email?.trim() ?? "";
    if (orderId.length < 6 || !email.includes("@")) {
      return NextResponse.json(
        { ok: false, error: "Укажите номер заказа и email" },
        { status: 400 }
      );
    }

    const order = await getOrderByOrderIdAndEmail(orderId, email);
    if (!order) {
      return NextResponse.json(
        { ok: false, error: "Заказ не найден. Проверьте номер и email." },
        { status: 404 }
      );
    }

    return NextResponse.json({ ok: true, order: publicOrderView(order) });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось найти заказ";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
