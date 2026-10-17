"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/products";

interface PublicOrder {
  orderId: string;
  statusLabel: string;
  createdAt: string;
  goodsRub: number;
  deliveryCostRub: number;
  totalRub: number;
  lines: Array<{
    name: string;
    quantity: number;
    lineTotalRub: number;
  }>;
  delivery: {
    type: string;
    cityName: string;
    officeAddress?: string;
    address?: string;
    awaitingQuote?: boolean;
  } | null;
  paymentUrl: string | null;
}

export function OrdersLookup() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") ?? "");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<PublicOrder | null>(null);

  useEffect(() => {
    const fromQuery = searchParams.get("orderId");
    if (fromQuery) setOrderId(fromQuery);
  }, [searchParams]);

  async function lookup(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setOrder(null);
    try {
      const response = await fetch("/api/orders/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, email }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        order?: PublicOrder;
      };
      if (!response.ok || !data.ok || !data.order) {
        throw new Error(data.error || "Заказ не найден");
      }
      setOrder(data.order);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка поиска");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-6">
      <h2 className="font-display text-2xl font-semibold text-foreground">
        Мои заказы
      </h2>
      <p className="mt-2 text-sm text-muted">
        Укажите номер заказа и email, чтобы посмотреть статус и ссылку на оплату.
      </p>

      <form className="mt-6 flex flex-col gap-3" onSubmit={(event) => void lookup(event)}>
        <input
          value={orderId}
          onChange={(event) => setOrderId(event.target.value)}
          className="w-full rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
          placeholder="Номер заказа"
        />
        <input
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="w-full rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
          placeholder="Email из заказа"
          autoComplete="email"
          inputMode="email"
        />
        {error ? <p className="text-sm text-terracotta-dark">{error}</p> : null}
        <Button type="submit" disabled={loading}>
          {loading ? "Ищем…" : "Найти заказ"}
        </Button>
      </form>

      {order ? (
        <div className="mt-6 rounded-2xl bg-cream p-4 text-sm">
          <p className="font-medium">{order.orderId}</p>
          <p className="mt-1 text-muted">{order.statusLabel}</p>
          <ul className="mt-4 flex flex-col gap-1">
            {order.lines.map((line) => (
              <li key={`${line.name}-${line.quantity}`} className="flex justify-between gap-3">
                <span>
                  {line.name} × {line.quantity}
                </span>
                <span>{formatPrice(line.lineTotalRub)}</span>
              </li>
            ))}
          </ul>
          {order.delivery ? (
            <p className="mt-3 text-muted">
              {order.delivery.cityName}
              {order.delivery.officeAddress
                ? ` · ${order.delivery.officeAddress}`
                : order.delivery.address
                  ? ` · ${order.delivery.address}`
                  : ""}
            </p>
          ) : null}
          <p className="mt-3">Товары: {formatPrice(order.goodsRub)}</p>
          <p>Доставка: {formatPrice(order.deliveryCostRub)}</p>
          <p className="font-medium">Итого: {formatPrice(order.totalRub)}</p>
          {order.paymentUrl ? (
            <a href={order.paymentUrl} className="mt-4 inline-block">
              <Button>Перейти к оплате</Button>
            </a>
          ) : (
            <p className="mt-4 text-muted">
              Ссылка на оплату появится, когда доставка будет рассчитана.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
