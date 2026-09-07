"use client";

import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";
import { getProducts, formatPrice } from "@/lib/products";

export default function CartPage() {
  const items = useCartStore((s) => s.items);
  const updateQuantity = useCartStore((s) => s.updateQuantity);
  const removeItem = useCartStore((s) => s.removeItem);
  const products = getProducts();

  const cartLines = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter(Boolean);

  const total = cartLines.reduce((sum, line) => {
    const price = line!.product.price;
    if (price == null) return sum;
    return sum + price * line!.quantity;
  }, 0);

  if (cartLines.length === 0) {
    return (
      <div className="flex flex-col items-center px-4 py-16 text-center">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-cream">
          <svg
            className="h-10 w-10 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z"
            />
          </svg>
        </div>
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Корзина пуста
        </h2>
        <p className="mt-2 max-w-xs text-sm text-muted">
          Добавьте товары из каталога, чтобы оформить заказ.
        </p>
        <Link href="/catalog" className="mt-6">
          <Button>Перейти в каталог</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <h2 className="font-display mb-6 text-2xl font-semibold text-foreground">
        Корзина
      </h2>

      <div className="flex flex-col gap-4">
        {cartLines.map((line) => (
          <div
            key={line!.productId}
            className="flex gap-4 rounded-2xl bg-cream p-4"
          >
            {line!.product.image ? (
              <img
                src={encodeURI(line!.product.image)}
                alt={line!.product.name}
                className="h-20 w-20 shrink-0 rounded-xl object-cover"
              />
            ) : (
              <div
                className="h-20 w-20 shrink-0 rounded-xl"
                style={{ backgroundColor: line!.product.imageColor }}
              />
            )}
            <div className="flex flex-1 flex-col">
              <h3 className="font-display text-base font-semibold leading-snug">
                {line!.product.name}
              </h3>
              {line!.product.price != null ? (
                <p className="mt-1 text-sm font-medium text-foreground">
                  {formatPrice(line!.product.price)}
                </p>
              ) : null}
              <div className="mt-auto flex items-center gap-3">
                <button
                  onClick={() =>
                    updateQuantity(line!.productId, line!.quantity - 1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-milk-dark text-olive"
                >
                  −
                </button>
                <span className="min-w-[1.5rem] text-center text-sm font-medium">
                  {line!.quantity}
                </span>
                <button
                  onClick={() =>
                    updateQuantity(line!.productId, line!.quantity + 1)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-milk-dark text-olive"
                >
                  +
                </button>
                <button
                  onClick={() => removeItem(line!.productId)}
                  className="ml-auto text-xs text-muted underline"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-6 rounded-2xl bg-cream p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted">Итого</span>
          <span className="font-display text-2xl font-semibold">
            {formatPrice(total)}
          </span>
        </div>
        <Link href="/checkout" className="mt-4 block">
          <Button className="w-full" size="lg">
            Оформить заказ
          </Button>
        </Link>
        <p className="mt-3 text-center text-xs text-muted">
          Далее — данные для связи и оплата через Т-Банк
        </p>
      </div>
    </div>
  );
}
