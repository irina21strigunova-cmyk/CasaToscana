"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function PaymentFailClient() {
  const searchParams = useSearchParams();
  const orderId =
    searchParams.get("OrderId") ||
    searchParams.get("orderId") ||
    searchParams.get("order_id");

  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-terracotta/80">
        Оплата не завершена
      </p>
      <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
        Платёж не прошёл
      </h2>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
        Оплата была отменена или завершилась с ошибкой. Товары остались в
        корзине — можно вернуться и попробовать снова.
      </p>
      {orderId ? (
        <p className="mt-5 rounded-2xl bg-cream px-5 py-3 text-sm">
          Номер заказа:{" "}
          <span className="font-medium text-foreground">{orderId}</span>
        </p>
      ) : null}
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Link href="/checkout">
          <Button>Попробовать снова</Button>
        </Link>
        <Link href="/cart">
          <Button variant="outline">В корзину</Button>
        </Link>
      </div>
    </div>
  );
}
