import type { CheckoutCustomer, OrderLine } from "@/lib/orders/calculate";
import type { TbankPaymentStatus } from "@/lib/tbank/types";

export interface PendingOrderRecord {
  orderId: string;
  paymentId?: string;
  amountKopecks: number;
  totalRub: number;
  lines: OrderLine[];
  customer: CheckoutCustomer;
  status: TbankPaymentStatus | "PENDING" | "PAID" | "FAILED";
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
}

/**
 * In-memory order registry for payment flow.
 * Source of truth for payment success remains T-Bank GetState / Notification.
 */
const globalStore = globalThis as typeof globalThis & {
  __casaToscanaOrders?: Map<string, PendingOrderRecord>;
};

function ordersMap(): Map<string, PendingOrderRecord> {
  if (!globalStore.__casaToscanaOrders) {
    globalStore.__casaToscanaOrders = new Map();
  }
  return globalStore.__casaToscanaOrders;
}

export function savePendingOrder(
  record: Omit<PendingOrderRecord, "createdAt" | "updatedAt" | "status"> & {
    status?: PendingOrderRecord["status"];
  }
): PendingOrderRecord {
  const now = new Date().toISOString();
  const full: PendingOrderRecord = {
    ...record,
    status: record.status ?? "PENDING",
    createdAt: now,
    updatedAt: now,
  };
  ordersMap().set(full.orderId, full);
  return full;
}

export function updateOrderByOrderId(
  orderId: string,
  patch: Partial<PendingOrderRecord>
): PendingOrderRecord | undefined {
  const current = ordersMap().get(orderId);
  if (!current) return undefined;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  ordersMap().set(orderId, next);
  return next;
}

export function getOrderByOrderId(
  orderId: string
): PendingOrderRecord | undefined {
  return ordersMap().get(orderId);
}

export function findOrderByPaymentId(
  paymentId: string
): PendingOrderRecord | undefined {
  for (const order of ordersMap().values()) {
    if (order.paymentId === paymentId) return order;
  }
  return undefined;
}
