import type { DeliverySelection } from "@/lib/cdek/types";
import { isDeliveryLineProductId } from "@/lib/delivery";
import { getProductById } from "@/lib/products";
import type { CartItem, ProductMarkCode } from "@/types/product";

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
  requiresMarking?: boolean;
  /** Real scanned code only; omitted until shipment. */
  markCode?: ProductMarkCode;
  paymentObject?: "commodity" | "service";
}

export interface CalculatedOrder {
  lines: OrderLine[];
  totalRub: number;
  amountKopecks: number;
  goodsRub: number;
  delivery: DeliverySelection | null;
}

export function calculateOrderFromCartItems(
  items: CartItem[],
  delivery: DeliverySelection | null = null
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
      requiresMarking: product.requiresMarking === true,
    });
  }

  return attachDeliveryLine(lines, delivery);
}

export function attachDeliveryLine(
  goodsLines: OrderLine[],
  delivery: DeliverySelection | null = null
): CalculatedOrder {
  const lines = goodsLines.filter((line) => !isDeliveryLineProductId(line.productId));
  if (lines.length === 0) {
    throw new Error("В заказе нет товаров");
  }

  const goodsRub = lines.reduce((sum, line) => sum + line.lineTotalRub, 0);
  const deliveryRub =
    delivery && delivery.costRub > 0
      ? Math.round(delivery.costRub * 100) / 100
      : 0;

  if (deliveryRub > 0 && delivery) {
    lines.push({
      productId: delivery.type === "yandex_courier" ? "delivery-yandex" : "delivery-cdek",
      name: `${delivery.type === "yandex_courier" ? "Яндекс Доставка" : "Доставка СДЭК"}${delivery.tariffName ? ` · ${delivery.tariffName}` : ""}`.slice(
        0,
        128
      ),
      quantity: 1,
      unitPriceRub: deliveryRub,
      lineTotalRub: deliveryRub,
      paymentObject: "service",
    });
  }

  const totalRub = goodsRub + deliveryRub;
  if (totalRub <= 0) {
    throw new Error("Сумма заказа должна быть больше нуля");
  }

  return {
    lines,
    totalRub,
    goodsRub,
    delivery,
    amountKopecks: Math.round(totalRub * 100),
  };
}

export function createOrderId(): string {
  const stamp = Date.now().toString(36).toUpperCase();
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `CT-${stamp}-${rand}`.slice(0, 50);
}
