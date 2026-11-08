"use client";

import { Button } from "@/components/ui/Button";
import { useCartStore } from "@/lib/cart/store";

export function AddToCartButton({
  productId,
  className,
}: {
  productId: string;
  className?: string;
}) {
  const addItem = useCartStore((state) => state.addItem);

  return (
    <Button size="sm" className={className} onClick={() => addItem(productId)}>
      В корзину
    </Button>
  );
}
