import type {
  NewOrderRecord,
  OrderStatusEvent,
  OrderStore,
  PendingOrderRecord,
} from "@/lib/orders/types";
import { goodsRubFromLines } from "@/lib/orders/types";

const CLAIM_STALE_MS = 2 * 60 * 1000;

function nowIso(): string {
  return new Date().toISOString();
}

function clone(order: PendingOrderRecord): PendingOrderRecord {
  return structuredClone(order);
}

export function createMemoryOrderStore(): OrderStore {
  const orders = new Map<string, PendingOrderRecord>();
  const paymentIndex = new Map<string, string>();

  function hydrate(orderId: string): PendingOrderRecord | undefined {
    const found = orders.get(orderId);
    return found ? clone(found) : undefined;
  }

  function persist(order: PendingOrderRecord): PendingOrderRecord {
    orders.set(order.orderId, clone(order));
    if (order.paymentId) {
      paymentIndex.set(order.paymentId, order.orderId);
    }
    return clone(order);
  }

  return {
    async savePendingOrder(record: NewOrderRecord): Promise<PendingOrderRecord> {
      const timestamp = nowIso();
      const status = record.status ?? "PENDING";
      const full: PendingOrderRecord = {
        ...record,
        goodsRub: record.goodsRub ?? goodsRubFromLines(record.lines),
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
        history: [
          {
            fromStatus: null,
            toStatus: status,
            note: "created",
            createdAt: timestamp,
          },
        ],
      };
      return persist(full);
    },

    async updateOrderByOrderId(
      orderId: string,
      patch: Partial<PendingOrderRecord>,
      note?: string
    ): Promise<PendingOrderRecord | undefined> {
      const current = orders.get(orderId);
      if (!current) return undefined;
      const timestamp = nowIso();
      const next: PendingOrderRecord = {
        ...current,
        ...patch,
        orderId: current.orderId,
        createdAt: current.createdAt,
        updatedAt: timestamp,
      };
      if (patch.status && patch.status !== current.status) {
        const event: OrderStatusEvent = {
          fromStatus: current.status,
          toStatus: patch.status,
          note: note ?? null,
          createdAt: timestamp,
        };
        next.history = [...(current.history ?? []), event];
      } else {
        next.history = current.history ?? [];
      }
      return persist(next);
    },

    async getOrderByOrderId(orderId: string) {
      return hydrate(orderId);
    },

    async findOrderByPaymentId(paymentId: string) {
      const orderId = paymentIndex.get(paymentId);
      if (orderId) return hydrate(orderId);
      for (const order of orders.values()) {
        if (order.paymentId === paymentId) return clone(order);
      }
      return undefined;
    },

    async getOrderByOrderIdAndEmail(orderId: string, email: string) {
      const order = hydrate(orderId);
      if (!order) return undefined;
      if (order.customer.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        return undefined;
      }
      return order;
    },

    async listOrders(limit = 100) {
      return [...orders.values()]
        .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
        .slice(0, limit)
        .map(clone);
    },

    async rememberPaymentMapping(orderId: string, paymentId: string) {
      if (!orderId || !paymentId) return;
      paymentIndex.set(paymentId, orderId);
      const current = orders.get(orderId);
      if (current) {
        persist({
          ...current,
          paymentId,
          updatedAt: nowIso(),
        });
      }
    },

    async getPaymentIdByOrderId(orderId: string) {
      return orders.get(orderId)?.paymentId;
    },

    async claimOrderForPayment(orderId) {
      const current = orders.get(orderId);
      if (!current) return { ok: false, reason: "not_found" };
      if (current.status === "PAID" || current.paidAt) {
        return { ok: false, reason: "paid" };
      }
      if (current.paymentId && current.paymentUrl) {
        return { ok: true, order: clone(current), existing: true };
      }
      if (current.paymentId) {
        return { ok: false, reason: "locked" };
      }
      const stale =
        current.status === "PAYMENT_CREATING" &&
        Date.now() - Date.parse(current.updatedAt) > CLAIM_STALE_MS;
      if (
        current.status !== "AWAITING_DELIVERY_QUOTE" &&
        !stale
      ) {
        return { ok: false, reason: "bad_status" };
      }
      if (current.status === "PAYMENT_CREATING" && !stale) {
        return { ok: false, reason: "locked" };
      }
      const claimed = persist({
        ...current,
        status: "PAYMENT_CREATING",
        updatedAt: nowIso(),
        history: [
          ...(current.history ?? []),
          {
            fromStatus: current.status,
            toStatus: "PAYMENT_CREATING",
            note: "claim",
            createdAt: nowIso(),
          },
        ],
      });
      return { ok: true, order: claimed, existing: false };
    },

    async releasePaymentClaim(orderId) {
      const current = orders.get(orderId);
      if (!current || current.status !== "PAYMENT_CREATING") return;
      persist({
        ...current,
        status: "AWAITING_DELIVERY_QUOTE",
        updatedAt: nowIso(),
        history: [
          ...(current.history ?? []),
          {
            fromStatus: "PAYMENT_CREATING",
            toStatus: "AWAITING_DELIVERY_QUOTE",
            note: "release-claim",
            createdAt: nowIso(),
          },
        ],
      });
    },
  };
}
