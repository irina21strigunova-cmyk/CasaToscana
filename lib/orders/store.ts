import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
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
  shippedAt?: string;
  closingReceiptSentAt?: string;
  refundedAt?: string;
}

/**
 * In-memory order registry for payment flow, with a best-effort snapshot
 * on disk so refund / closing-receipt can still resolve the original lines.
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

function dataDir(): string {
  return process.env.VERCEL ? "/tmp" : join(process.cwd(), ".data");
}

function paymentMapPath(): string {
  return join(dataDir(), "payment-map.json");
}

function ordersFilePath(): string {
  return join(dataDir(), "orders.json");
}

function readJsonObject(path: string): Record<string, unknown> {
  try {
    if (!existsSync(path)) return {};
    const parsed = JSON.parse(readFileSync(path, "utf8")) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJsonObject(path: string, value: unknown): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(value), "utf8");
  } catch {
    // Best-effort on serverless; CheckOrder remains the durable lookup.
  }
}

function isOrderRecord(value: unknown): value is PendingOrderRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as PendingOrderRecord;
  return (
    typeof record.orderId === "string" &&
    typeof record.amountKopecks === "number" &&
    Array.isArray(record.lines) &&
    Boolean(record.customer)
  );
}

function readOrdersFile(): Record<string, PendingOrderRecord> {
  const parsed = readJsonObject(ordersFilePath());
  const out: Record<string, PendingOrderRecord> = {};
  for (const [orderId, value] of Object.entries(parsed)) {
    if (isOrderRecord(value)) out[orderId] = value;
  }
  return out;
}

function persistOrder(order: PendingOrderRecord): void {
  const all = readOrdersFile();
  all[order.orderId] = order;
  writeJsonObject(ordersFilePath(), all);
}

function hydrateOrder(orderId: string): PendingOrderRecord | undefined {
  const mem = ordersMap().get(orderId);
  if (mem) return mem;
  const fromFile = readOrdersFile()[orderId];
  if (fromFile) {
    ordersMap().set(orderId, fromFile);
    return fromFile;
  }
  return undefined;
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
  persistOrder(full);
  return full;
}

export function updateOrderByOrderId(
  orderId: string,
  patch: Partial<PendingOrderRecord>
): PendingOrderRecord | undefined {
  const current = hydrateOrder(orderId);
  if (!current) return undefined;
  const next = {
    ...current,
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  ordersMap().set(orderId, next);
  persistOrder(next);
  return next;
}

export function getOrderByOrderId(
  orderId: string
): PendingOrderRecord | undefined {
  return hydrateOrder(orderId);
}

export function findOrderByPaymentId(
  paymentId: string
): PendingOrderRecord | undefined {
  for (const order of ordersMap().values()) {
    if (order.paymentId === paymentId) return order;
  }
  for (const order of Object.values(readOrdersFile())) {
    if (order.paymentId === paymentId) {
      ordersMap().set(order.orderId, order);
      return order;
    }
  }
  return undefined;
}

function readPaymentMapFile(): Record<string, string> {
  const parsed = readJsonObject(paymentMapPath());
  const out: Record<string, string> = {};
  for (const [orderId, paymentId] of Object.entries(parsed)) {
    if (typeof paymentId === "string" && paymentId) {
      out[orderId] = paymentId;
    }
  }
  return out;
}

function writePaymentMapFile(map: Record<string, string>): void {
  writeJsonObject(paymentMapPath(), map);
}

/** Persist orderId → PaymentId after Init so later GetState can resolve it. */
export function rememberPaymentMapping(
  orderId: string,
  paymentId: string
): void {
  if (!orderId || !paymentId) return;
  const current = getOrderByOrderId(orderId);
  if (current) {
    updateOrderByOrderId(orderId, { paymentId });
  }
  const map = readPaymentMapFile();
  map[orderId] = paymentId;
  writePaymentMapFile(map);
}

export function getPaymentIdByOrderId(orderId: string): string | undefined {
  const local = getOrderByOrderId(orderId)?.paymentId;
  if (local) return local;
  return readPaymentMapFile()[orderId];
}
