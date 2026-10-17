import { createMemoryOrderStore } from "@/lib/orders/memory-store";
import { createSupabaseOrderStore } from "@/lib/orders/supabase-store";
import type {
  NewOrderRecord,
  OrderStore,
  PendingOrderRecord,
} from "@/lib/orders/types";
import { isSupabaseConfigured } from "@/lib/supabase/server";

export type { PendingOrderRecord } from "@/lib/orders/types";
export {
  orderStatusLabel,
  publicOrderView,
} from "@/lib/orders/types";

const globalStore = globalThis as typeof globalThis & {
  __casaToscanaMemoryOrders?: OrderStore;
};

function memoryStore(): OrderStore {
  if (!globalStore.__casaToscanaMemoryOrders) {
    globalStore.__casaToscanaMemoryOrders = createMemoryOrderStore();
  }
  return globalStore.__casaToscanaMemoryOrders;
}

export function isDurableStoreConfigured(): boolean {
  return isSupabaseConfigured();
}

export function unpaidOrdersEnabled(): boolean {
  return isDurableStoreConfigured();
}

function activeStore(): OrderStore {
  if (isDurableStoreConfigured()) {
    return createSupabaseOrderStore();
  }
  return memoryStore();
}

export async function savePendingOrder(
  record: NewOrderRecord
): Promise<PendingOrderRecord> {
  return activeStore().savePendingOrder(record);
}

export async function updateOrderByOrderId(
  orderId: string,
  patch: Partial<PendingOrderRecord>,
  note?: string
): Promise<PendingOrderRecord | undefined> {
  return activeStore().updateOrderByOrderId(orderId, patch, note);
}

export async function getOrderByOrderId(
  orderId: string
): Promise<PendingOrderRecord | undefined> {
  return activeStore().getOrderByOrderId(orderId);
}

export async function findOrderByPaymentId(
  paymentId: string
): Promise<PendingOrderRecord | undefined> {
  return activeStore().findOrderByPaymentId(paymentId);
}

export async function getOrderByOrderIdAndEmail(
  orderId: string,
  email: string
): Promise<PendingOrderRecord | undefined> {
  return activeStore().getOrderByOrderIdAndEmail(orderId, email);
}

export async function listOrders(
  limit = 100
): Promise<PendingOrderRecord[]> {
  return activeStore().listOrders(limit);
}

export async function rememberPaymentMapping(
  orderId: string,
  paymentId: string
): Promise<void> {
  return activeStore().rememberPaymentMapping(orderId, paymentId);
}

export async function getPaymentIdByOrderId(
  orderId: string
): Promise<string | undefined> {
  return activeStore().getPaymentIdByOrderId(orderId);
}

export async function claimOrderForPayment(orderId: string) {
  return activeStore().claimOrderForPayment(orderId);
}

export async function releasePaymentClaim(orderId: string): Promise<void> {
  return activeStore().releasePaymentClaim(orderId);
}
