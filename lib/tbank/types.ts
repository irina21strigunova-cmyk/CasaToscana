export type TbankPaymentStatus =
  | "NEW"
  | "FORM_SHOWED"
  | "AUTHORIZING"
  | "3DS_CHECKING"
  | "3DS_CHECKED"
  | "AUTHORIZED"
  | "CONFIRMING"
  | "CONFIRMED"
  | "REVERSING"
  | "PARTIAL_REVERSED"
  | "REVERSED"
  | "REFUNDING"
  | "PARTIAL_REFUNDED"
  | "REFUNDED"
  | "CANCELED"
  | "DEADLINE_EXPIRED"
  | "REJECTED"
  | "AUTH_FAIL"
  | string;

export interface TbankInitResponse {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  TerminalKey?: string;
  Status?: TbankPaymentStatus;
  PaymentId?: string | number;
  OrderId?: string;
  Amount?: number;
  PaymentURL?: string;
}

export interface TbankGetStateResponse {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  TerminalKey?: string;
  Status?: TbankPaymentStatus;
  PaymentId?: string | number;
  OrderId?: string;
  Amount?: number;
}

export interface TbankCheckOrderPayment {
  Success?: boolean;
  ErrorCode?: string;
  Message?: string;
  Details?: string;
  Status?: TbankPaymentStatus;
  PaymentId?: string | number;
  Amount?: number;
}

export interface TbankCheckOrderResponse {
  Success: boolean;
  ErrorCode: string;
  Message?: string;
  Details?: string;
  OrderId?: string;
  Payments?: TbankCheckOrderPayment[];
}

export type PaymentOutcome = "paid" | "failed" | "refunded" | "pending";

export function isSuccessfulPaymentStatus(
  status: string | undefined
): boolean {
  return status === "CONFIRMED" || status === "AUTHORIZED";
}

export function isFailedPaymentStatus(status: string | undefined): boolean {
  return (
    status === "REJECTED" ||
    status === "CANCELED" ||
    status === "DEADLINE_EXPIRED" ||
    status === "AUTH_FAIL"
  );
}

export function isRefundedPaymentStatus(status: string | undefined): boolean {
  return status === "REFUNDED" || status === "PARTIAL_REFUNDED";
}

export function classifyPaymentStatus(
  status: string | undefined
): PaymentOutcome {
  if (isSuccessfulPaymentStatus(status)) return "paid";
  if (isFailedPaymentStatus(status)) return "failed";
  if (isRefundedPaymentStatus(status)) return "refunded";
  return "pending";
}
