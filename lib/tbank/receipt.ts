import type { CheckoutCustomer, OrderLine } from "@/lib/orders/calculate";
import type { ProductMarkCode, TbankMarkCodeType } from "@/types/product";

export const TBANK_FFD_VERSION = "1.2";
export const TBANK_TAXATION = "usn_income";
export const TBANK_TAX = "none";
export const TBANK_MEASUREMENT_UNIT = "шт";
export const TBANK_PAYMENT_OBJECT_DEFAULT = "commodity";
export const TBANK_PAYMENT_METHOD_PREPAY = "full_prepayment";
export const TBANK_PAYMENT_METHOD_FULL = "full_payment";

export type TbankPaymentMethod =
  | "full_prepayment"
  | "prepayment"
  | "advance"
  | "full_payment"
  | "partial_payment"
  | "credit"
  | "credit_payment";

export type TbankPaymentObject =
  | "commodity"
  | "goods_without_marking_code"
  | "goods_with_marking_code";

export interface TbankReceiptPayments {
  Cash: number;
  Electronic: number;
  AdvancePayment: number;
  Credit: number;
  Provision: number;
}

export interface TbankReceiptMarkCode {
  MarkCodeType: TbankMarkCodeType;
  Value: string;
}

export interface TbankReceiptItem {
  Name: string;
  Price: number;
  Quantity: number;
  Amount: number;
  Tax: typeof TBANK_TAX;
  PaymentMethod: TbankPaymentMethod;
  PaymentObject: TbankPaymentObject;
  MeasurementUnit: typeof TBANK_MEASUREMENT_UNIT;
  MarkProcessingMode?: string;
  MarkCode?: TbankReceiptMarkCode;
}

export interface TbankReceipt {
  FfdVersion: typeof TBANK_FFD_VERSION;
  Taxation: typeof TBANK_TAXATION;
  Email?: string;
  Phone?: string;
  Items: TbankReceiptItem[];
  Payments?: TbankReceiptPayments;
}

export interface ShipmentMarkCode {
  productId: string;
  markCodeType: TbankMarkCodeType;
  value: string;
}

const PLACEHOLDER_MARK_RE =
  /^(0+|x+|test|dummy|placeholder|null|n\/?a|none|-)$/i;

export function isUsableMarkCode(value: string | undefined): boolean {
  const code = value?.trim() ?? "";
  if (code.length < 8) return false;
  if (PLACEHOLDER_MARK_RE.test(code)) return false;
  return true;
}

export function normalizeReceiptPhone(
  phone: string | undefined
): string | undefined {
  if (!phone?.trim()) return undefined;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
    return `+7${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+7${digits}`;
  }
  if (phone.trim().startsWith("+") && digits.length >= 10) {
    return `+${digits}`;
  }
  return undefined;
}

export function normalizeReceiptEmail(
  email: string | undefined
): string | undefined {
  const value = email?.trim();
  if (!value) return undefined;
  return value.slice(0, 64);
}

function toKopecks(rub: number): number {
  return Math.round(rub * 100);
}

function usableProductMarkCode(
  markCode: ProductMarkCode | undefined
): ProductMarkCode | undefined {
  if (!markCode) return undefined;
  if (!isUsableMarkCode(markCode.value)) return undefined;
  return { type: markCode.type, value: markCode.value.trim() };
}

function buildItem(
  line: OrderLine,
  paymentMethod: TbankPaymentMethod,
  quantity = line.quantity,
  markCode = line.markCode
): TbankReceiptItem {
  const price = toKopecks(line.unitPriceRub);
  const item: TbankReceiptItem = {
    Name: line.name.slice(0, 128),
    Price: price,
    Quantity: quantity,
    Amount: price * quantity,
    Tax: TBANK_TAX,
    PaymentMethod: paymentMethod,
    PaymentObject: TBANK_PAYMENT_OBJECT_DEFAULT,
    MeasurementUnit: TBANK_MEASUREMENT_UNIT,
  };

  const usable = usableProductMarkCode(markCode);
  if (usable) {
    item.PaymentObject = "goods_with_marking_code";
    item.MarkProcessingMode = "0";
    item.MarkCode = {
      MarkCodeType: usable.type,
      Value: usable.value,
    };
  }

  return item;
}

function assertItemsMatchPayment(
  items: TbankReceiptItem[],
  expectedAmount: number
): void {
  for (const item of items) {
    if (item.Amount !== item.Price * item.Quantity) {
      throw new Error(
        `Сумма позиции «${item.Name}» должна быть равна Price × Quantity`
      );
    }
  }
  const sum = items.reduce((total, item) => total + item.Amount, 0);
  if (sum !== expectedAmount) {
    throw new Error(
      `Сумма позиций чека (${sum}) не совпадает с суммой платежа (${expectedAmount})`
    );
  }
}

export function applyShipmentMarkCodes(
  lines: OrderLine[],
  markCodes: ShipmentMarkCode[] | undefined
): { lines: OrderLine[]; unmarkedRequired: number } {
  if (!markCodes?.length) {
    const unmarkedRequired = lines.reduce(
      (count, line) =>
        line.requiresMarking && !usableProductMarkCode(line.markCode)
          ? count + line.quantity
          : count,
      0
    );
    return { lines, unmarkedRequired };
  }

  const queue = new Map<string, ProductMarkCode[]>();
  for (const code of markCodes) {
    if (!isUsableMarkCode(code.value)) continue;
    const list = queue.get(code.productId) ?? [];
    list.push({ type: code.markCodeType, value: code.value.trim() });
    queue.set(code.productId, list);
  }

  const expanded: OrderLine[] = [];
  let unmarkedRequired = 0;

  for (const line of lines) {
    const remaining = queue.get(line.productId) ?? [];
    let left = line.quantity;

    while (left > 0 && remaining.length > 0) {
      const markCode = remaining.shift();
      expanded.push({ ...line, quantity: 1, lineTotalRub: line.unitPriceRub, markCode });
      left -= 1;
    }

    if (left > 0) {
      expanded.push({
        ...line,
        quantity: left,
        lineTotalRub: line.unitPriceRub * left,
        markCode: undefined,
      });
      if (line.requiresMarking) unmarkedRequired += left;
    }
  }

  return { lines: expanded, unmarkedRequired };
}

export function buildTbankReceipt(input: {
  customer: CheckoutCustomer;
  lines: OrderLine[];
  amountKopecks: number;
  paymentMethod: TbankPaymentMethod;
  payments?: TbankReceiptPayments;
}): TbankReceipt {
  if (input.lines.length === 0) {
    throw new Error("Чек не может быть пустым");
  }
  if (input.lines.length > 100) {
    throw new Error("В чеке не больше 100 позиций");
  }

  const email = normalizeReceiptEmail(input.customer.email);
  const phone = normalizeReceiptPhone(input.customer.phone);
  if (!email && !phone) {
    throw new Error("Для чека нужен email или телефон покупателя");
  }

  const items = input.lines.map((line) => buildItem(line, input.paymentMethod));
  assertItemsMatchPayment(items, input.amountKopecks);

  const receipt: TbankReceipt = {
    FfdVersion: TBANK_FFD_VERSION,
    Taxation: TBANK_TAXATION,
    Items: items,
  };
  if (email) receipt.Email = email;
  if (phone) receipt.Phone = phone;
  if (input.payments) receipt.Payments = input.payments;

  return receipt;
}

/** Prepayment cheque sent with Init — money is received before handover. */
export function buildInitReceipt(
  customer: CheckoutCustomer,
  lines: OrderLine[],
  amountKopecks: number
): TbankReceipt {
  return buildTbankReceipt({
    customer,
    lines,
    amountKopecks,
    paymentMethod: TBANK_PAYMENT_METHOD_PREPAY,
  });
}

/**
 * Closing cheque after actual handover/shipment.
 * Offsets the previously received 100% prepayment (AdvancePayment),
 * no new electronic payment.
 */
export function buildClosingReceipt(
  customer: CheckoutCustomer,
  lines: OrderLine[],
  amountKopecks: number
): TbankReceipt {
  return buildTbankReceipt({
    customer,
    lines,
    amountKopecks,
    paymentMethod: TBANK_PAYMENT_METHOD_FULL,
    payments: {
      Cash: 0,
      Electronic: 0,
      AdvancePayment: amountKopecks,
      Credit: 0,
      Provision: 0,
    },
  });
}
