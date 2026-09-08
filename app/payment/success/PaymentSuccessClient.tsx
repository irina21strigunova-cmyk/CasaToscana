"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";

type StatusState =
  | { kind: "loading" }
  | { kind: "paid"; orderId: string }
  | { kind: "pending"; orderId: string | null; status: string | null }
  | { kind: "failed"; orderId: string | null }
  | { kind: "refunded"; orderId: string | null }
  | { kind: "error"; message: string };

export default function PaymentSuccessClient() {
  const searchParams = useSearchParams();
  const clearCart = useCartStore((s) => s.clearCart);
  const [state, setState] = useState<StatusState>({ kind: "loading" });
  const [refreshKey, setRefreshKey] = useState(0);

  const refresh = useCallback(() => {
    setState({ kind: "loading" });
    setRefreshKey((key) => key + 1);
  }, []);

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
    params.set("_", String(Date.now()));

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
          {
            cache: "no-store",
            headers: { "Cache-Control": "no-store" },
          }
        );
        const data = (await response.json()) as {
          ok?: boolean;
          paid?: boolean;
          outcome?: "paid" | "failed" | "refunded" | "pending";
          orderId?: string | null;
          status?: string | null;
          error?: string;
        };

        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Ошибка проверки оплаты");
        }

        if (cancelled) return;

        const outcome =
          data.outcome ?? (data.paid ? "paid" : "pending");
        const resolvedOrderId = data.orderId || orderId || null;

        if (outcome === "paid") {
          clearCart();
          setState({
            kind: "paid",
            orderId: resolvedOrderId || "—",
          });
          return;
        }

        if (outcome === "failed") {
          setState({ kind: "failed", orderId: resolvedOrderId });
          return;
        }

        if (outcome === "refunded") {
          setState({ kind: "refunded", orderId: resolvedOrderId });
          return;
        }

        setState({
          kind: "pending",
          orderId: resolvedOrderId,
          status: data.status ?? null,
        });
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
  }, [searchParams, clearCart, refreshKey]);

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
            Заказ оплачен
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
            <Button variant="outline" onClick={refresh}>
              Обновить статус
            </Button>
            <Link href="/checkout">
              <Button>К оформлению</Button>
            </Link>
          </div>
        </>
      ) : null}

      {state.kind === "failed" ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-terracotta/80">
            Оплата не завершена
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            Платёж не прошёл
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Банк отклонил или отменил оплату. Товары остались в корзине — можно
            вернуться и попробовать снова.
          </p>
          {state.orderId ? (
            <p className="mt-5 rounded-2xl bg-cream px-5 py-3 text-sm">
              Номер заказа:{" "}
              <span className="font-medium text-foreground">{state.orderId}</span>
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
        </>
      ) : null}

      {state.kind === "refunded" ? (
        <>
          <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
            Возврат
          </p>
          <h2 className="font-display mt-3 text-2xl font-semibold text-foreground">
            По заказу оформлен возврат
          </h2>
          <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
            Платёж был возвращён банком. Если это ошибка — напишите нам, мы
            проверим операцию.
          </p>
          {state.orderId ? (
            <p className="mt-5 rounded-2xl bg-cream px-5 py-3 text-sm">
              Номер заказа:{" "}
              <span className="font-medium text-foreground">{state.orderId}</span>
            </p>
          ) : null}
          <Link href="/catalog" className="mt-8">
            <Button>В каталог</Button>
          </Link>
        </>
      ) : null}

      {state.kind === "error" ? (
        <>
          <h2 className="font-display text-2xl font-semibold text-foreground">
            Не удалось проверить оплату
          </h2>
          <p className="mt-3 max-w-sm text-sm text-muted">{state.message}</p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Button variant="outline" onClick={refresh}>
              Обновить статус
            </Button>
            <Link href="/checkout">
              <Button>Вернуться к заказу</Button>
            </Link>
          </div>
        </>
      ) : null}
    </div>
  );
}
