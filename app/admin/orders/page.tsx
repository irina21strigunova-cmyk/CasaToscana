"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { formatPrice } from "@/lib/products";
import { deliveryTypeLabel } from "@/lib/delivery";

interface AdminOrder {
  orderId: string;
  status: string;
  statusLabel: string;
  createdAt: string;
  customer: { name: string; phone: string; email: string; comment?: string };
  lines: Array<{
    name: string;
    quantity: number;
    unitPriceRub: number;
    lineTotalRub: number;
  }>;
  delivery: {
    type: string;
    cityName: string;
    officeName?: string;
    officeAddress?: string;
    address?: string;
    awaitingQuote?: boolean;
    costRub?: number;
  } | null;
  goodsRub: number;
  deliveryCostRub: number;
  totalRub: number;
  paymentId: string | null;
  paymentUrl: string | null;
  paidAt: string | null;
  history: Array<{
    fromStatus: string | null;
    toStatus: string;
    note?: string | null;
    createdAt: string;
  }>;
}

export default function AdminOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [deliveryCost, setDeliveryCost] = useState("");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    const response = await fetch("/api/admin/orders", { cache: "no-store" });
    if (response.status === 401) {
      router.replace("/admin/login");
      return;
    }
    const data = (await response.json()) as {
      ok?: boolean;
      orders?: AdminOrder[];
      error?: string;
    };
    if (!response.ok || !data.ok) {
      throw new Error(data.error || "Не удалось загрузить заказы");
    }
    setOrders(data.orders ?? []);
  }, [router]);

  useEffect(() => {
    void load()
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Ошибка загрузки")
      )
      .finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!selectedId) return;
    void (async () => {
      const response = await fetch(
        `/api/admin/orders?orderId=${encodeURIComponent(selectedId)}`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as {
        ok?: boolean;
        order?: AdminOrder;
      };
      if (!response.ok || !data.ok || !data.order) return;
      setOrders((current) =>
        current.map((order) =>
          order.orderId === data.order?.orderId ? data.order : order
        )
      );
    })();
  }, [selectedId]);

  const selected = orders.find((order) => order.orderId === selectedId) ?? null;

  async function confirmDelivery() {
    if (!selected) return;
    const cost = Number(deliveryCost.replace(",", "."));
    if (!Number.isFinite(cost) || cost < 0) {
      setError("Укажите стоимость доставки числом");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/payments/confirm-delivery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: selected.orderId,
          deliveryCostRub: cost,
        }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        paymentUrl?: string;
      };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось создать ссылку");
      }
      await load();
      setDeliveryCost("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка");
    } finally {
      setSaving(false);
    }
  }

  async function copyLink(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="px-4 py-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-semibold">Заказы</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            void fetch("/api/admin/logout", { method: "POST" }).then(() =>
              router.replace("/admin/login")
            );
          }}
        >
          Выйти
        </Button>
      </div>

      {loading ? <p className="mt-4 text-sm text-muted">Загружаем…</p> : null}
      {error ? (
        <p className="mt-4 text-sm text-terracotta-dark">{error}</p>
      ) : null}

      <ul className="mt-4 flex flex-col gap-2">
        {orders.map((order) => (
          <li key={order.orderId}>
            <button
              type="button"
              className={`w-full rounded-2xl px-4 py-3 text-left ${
                selectedId === order.orderId ? "bg-olive text-white" : "bg-cream"
              }`}
              onClick={() => setSelectedId(order.orderId)}
            >
              <p className="text-sm font-medium">{order.orderId}</p>
              <p className="text-xs opacity-80">
                {order.statusLabel} · {order.customer.name}
              </p>
            </button>
          </li>
        ))}
      </ul>

      {orders.length === 0 && !loading ? (
        <p className="mt-6 text-sm text-muted">Заказов пока нет</p>
      ) : null}

      {selected ? (
        <div className="mt-6 rounded-2xl bg-cream p-4 text-sm">
          <p className="font-medium">{selected.orderId}</p>
          <p className="mt-1 text-muted">{selected.statusLabel}</p>
          <p className="mt-3">
            {selected.customer.name}
            <br />
            {selected.customer.phone}
            <br />
            {selected.customer.email}
          </p>
          {selected.customer.comment ? (
            <p className="mt-2 text-muted">{selected.customer.comment}</p>
          ) : null}

          <ul className="mt-4 flex flex-col gap-1">
            {selected.lines.map((line) => (
              <li key={`${line.name}-${line.quantity}`} className="flex justify-between gap-3">
                <span>
                  {line.name} × {line.quantity}
                </span>
                <span>{formatPrice(line.lineTotalRub)}</span>
              </li>
            ))}
          </ul>

          {selected.delivery ? (
            <div className="mt-4 text-muted">
              <p>Город: {selected.delivery.cityName}</p>
              <p>Способ: {deliveryTypeLabel(selected.delivery.type)}</p>
              {selected.delivery.officeAddress ? (
                <p>ПВЗ: {selected.delivery.officeAddress}</p>
              ) : null}
              {selected.delivery.address ? (
                <p>Адрес: {selected.delivery.address}</p>
              ) : null}
            </div>
          ) : null}

          <p className="mt-4">Товары: {formatPrice(selected.goodsRub)}</p>
          <p>Доставка: {selected.delivery?.awaitingQuote ? "после согласования" : formatPrice(selected.deliveryCostRub)}</p>
          <p className="font-medium">Итого: {formatPrice(selected.totalRub)}</p>
          {selected.paymentId ? (
            <p className="mt-2 text-muted">PaymentId: {selected.paymentId}</p>
          ) : null}
          {selected.paidAt ? (
            <p className="text-muted">Оплачен: {selected.paidAt}</p>
          ) : null}

          {selected.paymentUrl ? (
            <div className="mt-4 flex flex-col gap-2">
              <a
                href={selected.paymentUrl}
                className="break-all text-olive underline"
                target="_blank"
                rel="noreferrer"
              >
                {selected.paymentUrl}
              </a>
              <Button
                variant="outline"
                size="sm"
                onClick={() => void copyLink(selected.paymentUrl as string)}
              >
                {copied ? "Скопировано" : "Скопировать ссылку"}
              </Button>
            </div>
          ) : null}

          {selected.status === "AWAITING_DELIVERY_QUOTE" ? (
            <div className="mt-4 flex flex-col gap-2">
              <input
                value={deliveryCost}
                onChange={(event) => setDeliveryCost(event.target.value)}
                className="w-full rounded-2xl border border-foreground/10 bg-milk px-4 py-3 text-sm outline-none focus:border-olive/40"
                placeholder="Стоимость доставки, ₽"
                inputMode="decimal"
              />
              <Button disabled={saving} onClick={() => void confirmDelivery()}>
                {saving ? "Создаём ссылку…" : "Создать ссылку на оплату"}
              </Button>
            </div>
          ) : null}

          {selected.history.length > 0 ? (
            <div className="mt-4 text-xs text-muted">
              {selected.history.map((event) => (
                <p key={`${event.createdAt}-${event.toStatus}`}>
                  {event.createdAt}: {event.fromStatus ?? "—"} → {event.toStatus}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
