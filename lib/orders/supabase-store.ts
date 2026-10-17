import type { DeliverySelection } from "@/lib/cdek/types";
import type { CheckoutCustomer, OrderLine } from "@/lib/orders/calculate";
import type {
  NewOrderRecord,
  OrderStatus,
  OrderStatusEvent,
  OrderStore,
  PendingOrderRecord,
} from "@/lib/orders/types";
import { goodsRubFromLines } from "@/lib/orders/types";
import { describeSupabaseError, getSupabaseAdmin } from "@/lib/supabase/server";

interface OrderRow {
  order_id: string;
  status: string;
  amount_kopecks: number;
  total_rub: number | string;
  goods_rub: number | string;
  delivery_cost_rub: number | string;
  lines: OrderLine[];
  customer: CheckoutCustomer;
  delivery: DeliverySelection | null;
  payment_id: string | null;
  payment_url: string | null;
  cdek_uuid: string | null;
  cdek_number: string | null;
  cdek_status: string | null;
  paid_at: string | null;
  shipped_at: string | null;
  closing_receipt_sent_at: string | null;
  refunded_at: string | null;
  created_at: string;
  updated_at: string;
}

interface StatusEventRow {
  from_status: string | null;
  to_status: string;
  note: string | null;
  created_at: string;
}

function toNumber(value: number | string): number {
  return typeof value === "number" ? value : Number(value);
}

function fromRow(
  row: OrderRow,
  history: OrderStatusEvent[] = []
): PendingOrderRecord {
  return {
    orderId: row.order_id,
    status: row.status as OrderStatus,
    amountKopecks: row.amount_kopecks,
    totalRub: toNumber(row.total_rub),
    goodsRub: toNumber(row.goods_rub),
    lines: row.lines,
    customer: row.customer,
    delivery: row.delivery,
    paymentId: row.payment_id ?? undefined,
    paymentUrl: row.payment_url ?? undefined,
    cdekUuid: row.cdek_uuid,
    cdekNumber: row.cdek_number,
    cdekStatus: row.cdek_status,
    paidAt: row.paid_at ?? undefined,
    shippedAt: row.shipped_at ?? undefined,
    closingReceiptSentAt: row.closing_receipt_sent_at ?? undefined,
    refundedAt: row.refunded_at ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    history,
  };
}

function toInsert(record: PendingOrderRecord) {
  return {
    order_id: record.orderId,
    status: record.status,
    amount_kopecks: record.amountKopecks,
    total_rub: record.totalRub,
    goods_rub: record.goodsRub,
    delivery_cost_rub: record.delivery?.costRub ?? 0,
    lines: record.lines,
    customer: record.customer,
    delivery: record.delivery ?? null,
    payment_id: record.paymentId ?? null,
    payment_url: record.paymentUrl ?? null,
    cdek_uuid: record.cdekUuid ?? null,
    cdek_number: record.cdekNumber ?? null,
    cdek_status: record.cdekStatus ?? null,
    paid_at: record.paidAt ?? null,
    shipped_at: record.shippedAt ?? null,
    closing_receipt_sent_at: record.closingReceiptSentAt ?? null,
    refunded_at: record.refundedAt ?? null,
    created_at: record.createdAt,
    updated_at: record.updatedAt,
  };
}

async function loadHistory(orderId: string): Promise<OrderStatusEvent[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("order_status_events")
    .select("from_status, to_status, note, created_at")
    .eq("order_id", orderId)
    .order("created_at", { ascending: true });
  if (error || !data) return [];
  return (data as StatusEventRow[]).map((row) => ({
    fromStatus: row.from_status,
    toStatus: row.to_status,
    note: row.note,
    createdAt: row.created_at,
  }));
}

async function appendHistory(
  orderId: string,
  fromStatus: string | null,
  toStatus: string,
  note?: string
): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("order_status_events").insert({
    order_id: orderId,
    from_status: fromStatus,
    to_status: toStatus,
    note: note ?? null,
  });
  if (error) {
    console.error("[orders] failed to append status event", error.message);
  }
}

export function createSupabaseOrderStore(): OrderStore {
  return {
    async savePendingOrder(record: NewOrderRecord): Promise<PendingOrderRecord> {
      const timestamp = new Date().toISOString();
      const status = record.status ?? "PENDING";
      const full: PendingOrderRecord = {
        ...record,
        goodsRub: record.goodsRub ?? goodsRubFromLines(record.lines),
        status,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("orders")
        .insert(toInsert(full))
        .select("*")
        .single();
      if (error || !data) {
        throw new Error(describeSupabaseError(error));
      }
      await appendHistory(full.orderId, null, status, "created");
      return fromRow(data as OrderRow, [
        {
          fromStatus: null,
          toStatus: status,
          note: "created",
          createdAt: timestamp,
        },
      ]);
    },

    async updateOrderByOrderId(
      orderId: string,
      patch: Partial<PendingOrderRecord>,
      note?: string
    ): Promise<PendingOrderRecord | undefined> {
      const supabase = getSupabaseAdmin();
      const current = await this.getOrderByOrderId(orderId);
      if (!current) return undefined;

      const nextStatus = patch.status ?? current.status;
      const payload: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
      };
      if (patch.status !== undefined) payload.status = patch.status;
      if (patch.amountKopecks !== undefined) {
        payload.amount_kopecks = patch.amountKopecks;
      }
      if (patch.totalRub !== undefined) payload.total_rub = patch.totalRub;
      if (patch.goodsRub !== undefined) payload.goods_rub = patch.goodsRub;
      if (patch.lines !== undefined) payload.lines = patch.lines;
      if (patch.customer !== undefined) payload.customer = patch.customer;
      if (patch.delivery !== undefined) {
        payload.delivery = patch.delivery;
        payload.delivery_cost_rub = patch.delivery?.costRub ?? 0;
      }
      if (patch.paymentId !== undefined) payload.payment_id = patch.paymentId;
      if (patch.paymentUrl !== undefined) payload.payment_url = patch.paymentUrl;
      if (patch.cdekUuid !== undefined) payload.cdek_uuid = patch.cdekUuid;
      if (patch.cdekNumber !== undefined) payload.cdek_number = patch.cdekNumber;
      if (patch.cdekStatus !== undefined) payload.cdek_status = patch.cdekStatus;
      if (patch.paidAt !== undefined) payload.paid_at = patch.paidAt;
      if (patch.shippedAt !== undefined) payload.shipped_at = patch.shippedAt;
      if (patch.closingReceiptSentAt !== undefined) {
        payload.closing_receipt_sent_at = patch.closingReceiptSentAt;
      }
      if (patch.refundedAt !== undefined) payload.refunded_at = patch.refundedAt;

      const { data, error } = await supabase
        .from("orders")
        .update(payload)
        .eq("order_id", orderId)
        .select("*")
        .single();
      if (error || !data) {
        throw new Error(describeSupabaseError(error));
      }
      if (patch.status && patch.status !== current.status) {
        await appendHistory(orderId, current.status, nextStatus, note);
      }
      return fromRow(data as OrderRow, await loadHistory(orderId));
    },

    async getOrderByOrderId(orderId: string) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("order_id", orderId)
        .maybeSingle();
      if (error) {
        throw new Error(describeSupabaseError(error));
      }
      if (!data) return undefined;
      return fromRow(data as OrderRow, await loadHistory(orderId));
    },

    async findOrderByPaymentId(paymentId: string) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("payment_id", paymentId)
        .maybeSingle();
      if (error) {
        throw new Error(describeSupabaseError(error));
      }
      if (!data) return undefined;
      const row = data as OrderRow;
      return fromRow(row, await loadHistory(row.order_id));
    },

    async getOrderByOrderIdAndEmail(orderId: string, email: string) {
      const order = await this.getOrderByOrderId(orderId);
      if (!order) return undefined;
      if (order.customer.email.trim().toLowerCase() !== email.trim().toLowerCase()) {
        return undefined;
      }
      return order;
    },

    async listOrders(limit = 100) {
      const supabase = getSupabaseAdmin();
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) {
        throw new Error(describeSupabaseError(error));
      }
      return ((data ?? []) as OrderRow[]).map((row) => fromRow(row));
    },

    async rememberPaymentMapping(orderId: string, paymentId: string) {
      if (!orderId || !paymentId) return;
      const supabase = getSupabaseAdmin();
      await supabase
        .from("orders")
        .update({
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId);
    },

    async getPaymentIdByOrderId(orderId: string) {
      const order = await this.getOrderByOrderId(orderId);
      return order?.paymentId;
    },

    async claimOrderForPayment(orderId) {
      const supabase = getSupabaseAdmin();
      const current = await this.getOrderByOrderId(orderId);
      if (!current) return { ok: false, reason: "not_found" };
      if (current.status === "PAID" || current.paidAt) {
        return { ok: false, reason: "paid" };
      }
      if (current.paymentId && current.paymentUrl) {
        return { ok: true, order: current, existing: true };
      }
      if (current.paymentId) {
        return { ok: false, reason: "locked" };
      }

      const claimPayload = {
        status: "PAYMENT_CREATING",
        updated_at: new Date().toISOString(),
      };

      const first = await supabase
        .from("orders")
        .update(claimPayload)
        .eq("order_id", orderId)
        .eq("status", "AWAITING_DELIVERY_QUOTE")
        .is("payment_id", null)
        .select("*")
        .maybeSingle();
      if (first.error) {
        throw new Error(describeSupabaseError(first.error));
      }

      let claimed = first.data as OrderRow | null;
      if (!claimed) {
        const staleBefore = new Date(Date.now() - 2 * 60 * 1000).toISOString();
        const stale = await supabase
          .from("orders")
          .update(claimPayload)
          .eq("order_id", orderId)
          .eq("status", "PAYMENT_CREATING")
          .is("payment_id", null)
          .lt("updated_at", staleBefore)
          .select("*")
          .maybeSingle();
        if (stale.error) {
          throw new Error(describeSupabaseError(stale.error));
        }
        claimed = (stale.data as OrderRow | null) ?? null;
      }

      if (!claimed) {
        const again = await this.getOrderByOrderId(orderId);
        if (again?.paymentId && again.paymentUrl) {
          return { ok: true, order: again, existing: true };
        }
        if (again?.status === "PAYMENT_CREATING") {
          return { ok: false, reason: "locked" };
        }
        return { ok: false, reason: "bad_status" };
      }

      await appendHistory(
        orderId,
        current.status,
        "PAYMENT_CREATING",
        "claim"
      );
      return {
        ok: true,
        order: fromRow(claimed, await loadHistory(orderId)),
        existing: false,
      };
    },

    async releasePaymentClaim(orderId) {
      const supabase = getSupabaseAdmin();
      const { data } = await supabase
        .from("orders")
        .update({
          status: "AWAITING_DELIVERY_QUOTE",
          updated_at: new Date().toISOString(),
        })
        .eq("order_id", orderId)
        .eq("status", "PAYMENT_CREATING")
        .is("payment_id", null)
        .select("order_id")
        .maybeSingle();
      if (data) {
        await appendHistory(
          orderId,
          "PAYMENT_CREATING",
          "AWAITING_DELIVERY_QUOTE",
          "release-claim"
        );
      }
    },
  };
}
