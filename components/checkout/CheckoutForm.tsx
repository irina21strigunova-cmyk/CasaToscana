"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  DeliveryFields,
  type DeliveryPayload,
} from "@/components/checkout/DeliveryFields";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice, getProducts } from "@/lib/products";

export function CheckoutForm({
  unpaidOrdersEnabled,
}: {
  unpaidOrdersEnabled: boolean;
}) {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const clearCart = useCartStore((s) => s.clearCart);
  const products = getProducts();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [delivery, setDelivery] = useState<DeliveryPayload | null>(null);
  const [unpaidEnabled, setUnpaidEnabled] = useState(unpaidOrdersEnabled);
  const [placedOrder, setPlacedOrder] = useState<{
    orderId: string;
    statusLabel: string;
    emailBuyer?: boolean;
  } | null>(null);

  const awaitingQuote = delivery?.awaitingQuote === true;
  const checkoutItems = useMemo(
    () => items.map(({ productId, quantity }) => ({ productId, quantity })),
    [items]
  );

  useEffect(() => {
    void (async () => {
      try {
        const response = await fetch("/api/orders/capabilities", {
          cache: "no-store",
        });
        const data = (await response.json()) as { unpaidOrders?: boolean };
        if (typeof data.unpaidOrders === "boolean") {
          setUnpaidEnabled(data.unpaidOrders);
        }
      } catch {
        // Keep server-provided flag.
      }
    })();
  }, []);

  const cartLines = useMemo(
    () =>
      items
        .map((item) => {
          const product = products.find((p) => p.id === item.productId);
          if (!product) return null;
          return { ...item, product };
        })
        .filter(Boolean),
    [items, products]
  );

  const total = cartLines.reduce((sum, line) => {
    const price = line!.product.price;
    if (price == null) return sum;
    return sum + price * line!.quantity;
  }, 0);

  function checkoutBody() {
    return {
      items: checkoutItems,
      customer: { name, phone, email, comment },
      delivery,
    };
  }

  function ensureReadyToSubmit(): boolean {
    setError(null);
    if (!acceptedTerms) {
      setError(
        "Чтобы оформить заказ, подтвердите согласие с офертой и обработкой персональных данных."
      );
      return false;
    }
    if (!delivery) {
      setError("Выберите город и способ доставки");
      return false;
    }
    return true;
  }

  async function handlePay() {
    if (!ensureReadyToSubmit() || awaitingQuote) return;
    setLoading(true);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutBody()),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        paymentUrl?: string;
        error?: string;
      };

      if (!response.ok || !data.ok || !data.paymentUrl) {
        throw new Error(data.error || "Не удалось создать платёж");
      }

      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка оплаты");
      setLoading(false);
    }
  }

  async function handlePlaceUnpaidOrder() {
    if (!ensureReadyToSubmit() || !awaitingQuote) return;
    if (!unpaidEnabled) {
      setError(
        "Оформление без оплаты временно недоступно. Постоянное хранилище заказов ещё не подключено."
      );
      return;
    }
    setLoading(true);
    try {
      const response = await fetch("/api/orders/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutBody()),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        orderId?: string;
        statusLabel?: string;
        error?: string;
        email?: { buyer?: boolean };
      };

      if (!response.ok || !data.ok || !data.orderId) {
        throw new Error(data.error || "Не удалось оформить заказ");
      }

      clearCart();
      setPlacedOrder({
        orderId: data.orderId,
        statusLabel: data.statusLabel || "Ожидает расчёта доставки",
        emailBuyer: data.email?.buyer === true,
      });
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось оформить заказ");
      setLoading(false);
    }
  }

  if (placedOrder) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Заказ принят
        </h2>
        <p className="mt-3 max-w-sm text-sm leading-relaxed text-muted">
          Номер заказа {placedOrder.orderId}. Статус: {placedOrder.statusLabel}.
          Заказ ещё не оплачен. Стоимость доставки будет рассчитана после
          оформления заказа.
        </p>
        {placedOrder.emailBuyer ? (
          <p className="mt-3 max-w-sm text-sm text-muted">
            Подтверждение отправлено на вашу почту.
          </p>
        ) : (
          <p className="mt-3 max-w-sm text-sm text-muted">
            Сохраните номер заказа. Письмо может прийти позже — заказ уже
            записан.
          </p>
        )}
        <Link
          href={`/orders?orderId=${encodeURIComponent(placedOrder.orderId)}`}
          className="mt-6"
        >
          <Button>Открыть заказ</Button>
        </Link>
      </div>
    );
  }

  if (cartLines.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Корзина пуста
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Добавьте товары, чтобы оформить заказ.
        </p>
        <Link href="/catalog" className="mt-6">
          <Button>В каталог</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <button
        type="button"
        onClick={() => router.push("/cart")}
        className="mb-4 text-sm text-muted underline"
      >
        ← Назад в корзину
      </button>

      <h2 className="font-display mb-6 text-2xl font-semibold text-foreground">
        Оформление заказа
      </h2>

      <div className="mb-6 rounded-2xl bg-cream p-4">
        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-olive/75">
          Состав заказа
        </p>
        <ul className="mt-3 flex flex-col gap-2">
          {cartLines.map((line) => (
            <li
              key={line!.productId}
              className="flex items-start justify-between gap-3 text-sm"
            >
              <span className="text-foreground">
                {line!.product.name}
                <span className="text-muted"> × {line!.quantity}</span>
              </span>
              <span className="shrink-0 font-medium">
                {line!.product.price != null
                  ? formatPrice(line!.product.price * line!.quantity)
                  : "—"}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-center justify-between border-t border-foreground/10 pt-3">
          <span className="text-sm text-muted">Итого</span>
          <span className="font-display text-xl font-semibold">
            {formatPrice(total)}
          </span>
        </div>
      </div>

      <DeliveryFields
        items={checkoutItems}
        goodsTotal={total}
        onChange={setDelivery}
      />

      <div className="mt-6 flex flex-col gap-3">
        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Имя
          </span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
            placeholder="Как к вам обращаться"
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Телефон
          </span>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
            placeholder="+7 …"
            autoComplete="tel"
            inputMode="tel"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Email
          </span>
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
            placeholder="для чека и связи"
            autoComplete="email"
            inputMode="email"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Комментарий
          </span>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="min-h-[5rem] w-full resize-none rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
            placeholder="По желанию"
          />
        </label>
      </div>

      {error ? (
        <p className="mt-4 rounded-2xl bg-terracotta/10 px-4 py-3 text-sm text-terracotta-dark">
          {error}
        </p>
      ) : null}

      <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl bg-cream px-4 py-3">
        <input
          type="checkbox"
          checked={acceptedTerms}
          onChange={(event) => setAcceptedTerms(event.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-olive"
        />
        <span className="text-[13px] font-light leading-relaxed text-foreground/85">
          Оформляя заказ, я принимаю условия{" "}
          <Link
            href="/offer"
            className="underline underline-offset-2 hover:text-olive"
            onClick={(event) => event.stopPropagation()}
          >
            Публичной оферты
          </Link>{" "}
          и даю согласие на обработку персональных данных в соответствии с{" "}
          <Link
            href="/privacy"
            className="underline underline-offset-2 hover:text-olive"
            onClick={(event) => event.stopPropagation()}
          >
            Политикой конфиденциальности
          </Link>
          .
        </span>
      </label>

      {awaitingQuote ? (
        <>
          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={loading || !acceptedTerms || !delivery || !unpaidEnabled}
            onClick={handlePlaceUnpaidOrder}
          >
            {loading ? "Оформляем заказ…" : "Оформить заказ"}
          </Button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            {unpaidEnabled
              ? "Оплата пока не списывается. После расчёта доставки вы получите ссылку на оплату товаров и доставки."
              : "Оформление без оплаты откроется после подключения постоянной базы заказов."}
          </p>
        </>
      ) : (
        <>
          <Button
            className="mt-4 w-full"
            size="lg"
            disabled={loading || !acceptedTerms || !delivery}
            onClick={handlePay}
          >
            {loading ? "Создаём платёж…" : "Оплатить"}
          </Button>
          <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
            Вы перейдёте на защищённую форму Т-Банка. Корзина очистится только
            после подтверждённой оплаты.
          </p>
        </>
      )}
    </div>
  );
}
