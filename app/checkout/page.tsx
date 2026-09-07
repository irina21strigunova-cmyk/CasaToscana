"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";
import { formatPrice, getProducts } from "@/lib/products";

export default function CheckoutPage() {
  const router = useRouter();
  const items = useCartStore((s) => s.items);
  const products = getProducts();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

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

  async function handlePay() {
    setError(null);
    setLoading(true);
    try {
      const response = await fetch("/api/payments/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
          })),
          customer: { name, phone, email, comment },
        }),
      });

      const data = (await response.json()) as {
        ok?: boolean;
        paymentUrl?: string;
        error?: string;
        orderId?: string;
      };

      if (!response.ok || !data.ok || !data.paymentUrl) {
        throw new Error(data.error || "Не удалось создать платёж");
      }

      // Redirect to T-Bank secure payment form. Cart is NOT cleared here.
      window.location.href = data.paymentUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка оплаты");
      setLoading(false);
    }
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

      <div className="flex flex-col gap-3">
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

      <Button
        className="mt-6 w-full"
        size="lg"
        disabled={loading}
        onClick={handlePay}
      >
        {loading ? "Создаём платёж…" : "Оплатить"}
      </Button>

      <p className="mt-3 text-center text-[11px] leading-relaxed text-muted">
        Вы перейдёте на защищённую форму Т-Банка. Корзина очистится только после
        подтверждённой оплаты.
      </p>
    </div>
  );
}
