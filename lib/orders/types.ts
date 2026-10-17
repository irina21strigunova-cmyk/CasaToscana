import type { DeliverySelection } from "@/lib/cdek/types";
import type { CheckoutCustomer, OrderLine } from "@/lib/orders/calculate";
import type { TbankPaymentStatus } from "@/lib/tbank/types";

export type OrderStatus =
  | TbankPaymentStatus
  | "PENDING"
  | "PAID"
  | "FAILED"
  | "AWAITING_DELIVERY_QUOTE"
  | "PAYMENT_CREATING";

export interface OrderStatusEvent {
  fromStatus: string | null;
  toStatus: string;
  note?: string | null;
  createdAt: string;
}

export interface PendingOrderRecord {
  orderId: string;
  paymentId?: string;
  paymentUrl?: string;
  amountKopecks: number;
  totalRub: number;
  goodsRub: number;
  lines: OrderLine[];
  customer: CheckoutCustomer;
  delivery?: DeliverySelection | null;
  cdekUuid?: string | null;
  cdekNumber?: string | null;
  cdekStatus?: string | null;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
  shippedAt?: string;
  closingReceiptSentAt?: string;
  refundedAt?: string;
  history?: OrderStatusEvent[];
}

export type NewOrderRecord = Omit<
  PendingOrderRecord,
  "createdAt" | "updatedAt" | "status" | "history"
> & {
  status?: OrderStatus;
};

export interface OrderStore {
  savePendingOrder(record: NewOrderRecord): Promise<PendingOrderRecord>;
  updateOrderByOrderId(
    orderId: string,
    patch: Partial<PendingOrderRecord>,
    note?: string
  ): Promise<PendingOrderRecord | undefined>;
  getOrderByOrderId(orderId: string): Promise<PendingOrderRecord | undefined>;
  findOrderByPaymentId(
    paymentId: string
  ): Promise<PendingOrderRecord | undefined>;
  getOrderByOrderIdAndEmail(
    orderId: string,
    email: string
  ): Promise<PendingOrderRecord | undefined>;
  listOrders(limit?: number): Promise<PendingOrderRecord[]>;
  rememberPaymentMapping(orderId: string, paymentId: string): Promise<void>;
  getPaymentIdByOrderId(orderId: string): Promise<string | undefined>;
  claimOrderForPayment(
    orderId: string
  ): Promise<
    | { ok: true; order: PendingOrderRecord; existing: boolean }
    | { ok: false; reason: "not_found" | "bad_status" | "locked" | "paid" }
  >;
  releasePaymentClaim(orderId: string): Promise<void>;
}

export function goodsRubFromLines(lines: OrderLine[]): number {
  return lines
    .filter((line) => line.productId !== "delivery-cdek")
    .reduce((sum, line) => sum + line.lineTotalRub, 0);
}

export function deliveryCostFromRecord(
  order: Pick<PendingOrderRecord, "delivery" | "lines">
): number {
  if (order.delivery && order.delivery.costRub > 0) {
    return Math.round(order.delivery.costRub * 100) / 100;
  }
  const deliveryLine = order.lines.find(
    (line) => line.productId === "delivery-cdek"
  );
  return deliveryLine ? deliveryLine.lineTotalRub : 0;
}

export function publicOrderView(order: PendingOrderRecord) {
  return {
    orderId: order.orderId,
    status: order.status,
    statusLabel: orderStatusLabel(order.status),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    goodsRub: order.goodsRub,
    deliveryCostRub: deliveryCostFromRecord(order),
    totalRub: order.totalRub,
    amountKopecks: order.amountKopecks,
    lines: order.lines.map((line) => ({
      name: line.name,
      quantity: line.quantity,
      unitPriceRub: line.unitPriceRub,
      lineTotalRub: line.lineTotalRub,
    })),
    delivery: order.delivery
      ? {
          type: order.delivery.type,
          cityName: order.delivery.cityName,
          officeName: order.delivery.officeName,
          officeAddress: order.delivery.officeAddress,
          address: order.delivery.address,
          awaitingQuote: order.delivery.awaitingQuote === true,
        }
      : null,
    paymentUrl: order.paymentUrl ?? null,
    paidAt: order.paidAt ?? null,
  };
}

export function orderStatusLabel(status: string): string {
  switch (status) {
    case "AWAITING_DELIVERY_QUOTE":
      return "Ожидает расчёта доставки";
    case "PAYMENT_CREATING":
      return "Создаём ссылку на оплату";
    case "PENDING":
    case "NEW":
    case "FORM_SHOWED":
    case "AUTHORIZING":
    case "3DS_CHECKING":
    case "3DS_CHECKED":
    case "CONFIRMING":
      return "Ожидает оплаты";
    case "AUTHORIZED":
    case "CONFIRMED":
    case "PAID":
      return "Оплачен";
    case "FAILED":
    case "REJECTED":
    case "CANCELED":
    case "DEADLINE_EXPIRED":
    case "AUTH_FAIL":
      return "Оплата не прошла";
    case "REFUNDED":
    case "PARTIAL_REFUNDED":
    case "REVERSED":
      return "Возврат";
    default:
      return status;
  }
}
