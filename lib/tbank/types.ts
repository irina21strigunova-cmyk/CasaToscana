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

export function isSuccessfulPaymentStatus(
  status: string | undefined
): boolean {
  return status === "CONFIRMED" || status === "AUTHORIZED";
}
