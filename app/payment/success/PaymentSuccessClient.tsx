"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";

type StatusState =
  | { kind: "loading" }
  | { kind: "paid"; orderId: string }
  | { kind: "pending"; orderId: string | null; status: string | null }
  | { kind: "error"; message: string };

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<StatusState>({ kind: "loading" });

  useEffect(() => {
    const orderId =
      searchParams.get("OrderId") ||
      searchParams.get("orderId") ||
      searchParams.get("order_id");
    const paymentId =
      searchParams.get("PaymentId") ||
      searchParams.get("paymentId") ||
      searchParams.get("Paymentid");

    const params = new URLSearchParams();
    if (orderId) params.set("orderId", orderId);
    if (paymentId) params.set("paymentId", paymentId);

    let cancelled = false;

    async function verify() {
      try {
        if (!orderId && !paymentId) {
          if (!cancelled) {
            setState({
              kind: "error",
              message: "Не удалось определить номер заказа.",
            });
          }
          return;
        }

        const response = await fetch(
          `/api/payments/status?${params.toString()}`,
          { cache: "no-store" }
        );
        const data = (await response.json()) as {
          ok?: boolean;
          paid?: boolean;
          orderId?: string | null;
          status?: string | null;
          error?: string;
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Ошибка проверки оплаты");
        }

        if (cancelled) return;

        if (data.paid) {
          clearCart();
          setState({
            kind: "paid",
            orderId: data.orderId || orderId || "—",
          });
        } else {
          setState({
            kind: "pending",
            orderId: data.orderId || orderId || null,
            status: data.status ?? null,
          });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            kind: "error",
            message:
              error instanceof Error
                ? error.message
                : "Не удалось подтвердить оплату",
          });
        }
      }
    }

    void verify();
    return () => {
      cancelled = true;
    };
  }, [searchParams, clearCart]);

  return (
    <div className="flex flex-col items-center px-4 py-16 text-center">
      {state.kind === "loading" ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
            Проверка оплаты
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            Подтверждаем платёж…
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted">
            Подождите несколько секунд — мы сверяем статус с Т-Банком.
          </p>
        </>
      ) : null}

      {state.kind === "paid" ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
            Оплата прошла
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            Заказ принят
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Спасибо! Оплата подтверждена, заказ принят в работу.
          </p>
          <p className="mt-5 rounded-2xl bg-cream px-5 py-3 text-sm">
            Номер заказа:{" "}
            <span className="font-medium text-foreground">{state.orderId}</span>
          </p>
          <Link href="/catalog" className="mt-8">
            <Button>В каталог</Button>
          </Link>
        </>
      ) : null}

      {state.kind === "pending" ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
            Ожидание
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            Платёж ещё обрабатывается
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Банк ещё не подтвердил успешную оплату. Корзина сохранена. Обновите
            страницу через минуту или вернитесь к заказу.
          </p>
          {state.orderId ? (
            <p className="mt-5 rounded-2xl bg-cream px-5 py-3 text-sm">
              Номер заказа:{" "}
              <span className="font-medium text-foreground">{state.orderId}</span>
            </p>
          ) : null}
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={() => window.location.reload()}>
              Обновить статус
            </Button>
            <Link href="/checkout">
              <Button>К оформлению</Button>
            </Link>
          </div>
        </>
      ) : null}

      {state.kind === "error" ? (
        <>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Не удалось проверить оплату
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted">{state.message}</p>
          <Link href="/checkout" className="mt-8">
            <Button>Вернуться к заказу</Button>
          </Link>
        </>
      ) : null}
    </div>
  );
}
