import { getProductById } from "@/lib/products";
import type { CartItem } from "@/types/product";

export interface CheckoutCustomer {
  name: string;
  phone: string;
  email: string;
  comment?: string;
}

export interface OrderLine {
  productId: string;
  name: string;
  quantity: number;
  unitPriceRub: number;
  lineTotalRub: number;
}

export interface CalculatedOrder {
  lines: OrderLine[];
  totalRub: number;
  amountKopecks: number;
}

export function calculateOrderFromCartItems(
  items: CartItem[]
): CalculatedOrder {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Корзина пуста");
  }

  const lines: OrderLine[] = [];

  for (const item of items) {
    if (!item?.productId || !Number.isFinite(item.quantity) || item.quantity < 1) {
      throw new Error("Некорректная позиция корзины");
    }

    const product = getProductById(item.productId);
    if (!product) {
      throw new Error(`Товар не найден: ${item.productId}`);
    }
    if (product.price == null) {
      throw new Error(
        `Для товара «${product.name}» цена не указана — оплата недоступна`
      );
    }

    const quantity = Math.floor(item.quantity);
    const unitPriceRub = product.price;
    lines.push({
      productId: product.id,
      name: product.name,
      quantity,
      unitPriceRub,
      lineTotalRub: unitPriceRub * quantity,
    });
  }

  const totalRub = lines.reduce((sum, line) => sum + line.lineTotalRub, 0);
  if (totalRub <= 0) {
    throw new Error("Сумма заказа должна быть больше нуля");
  }

  return {
    lines,
    totalRub,
    amountKopecks: Math.round(totalRub * 100),
  };
}

export function createOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CT-${stamp}-${rand}`.slice(0, 50);
}
