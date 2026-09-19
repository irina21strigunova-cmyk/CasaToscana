import type { CheckoutCustomer, OrderLine } from "@/lib/orders/calculate";
import { buildInitReceipt, buildClosingReceipt } from "@/lib/tbank/receipt";
import { buildTbankToken } from "@/lib/tbank/token";
import { tbankFetch } from "@/lib/tbank/tls";
import type {
  TbankCancelResponse,
  TbankCheckOrderResponse,
  TbankClosingReceiptResponse,
  TbankGetStateResponse,
  TbankInitResponse,
} from "@/lib/tbank/types";

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

export function getTbankConfig() {
  return {
    terminalKey: requireEnv("TBANK_TERMINAL_KEY"),
    password: requireEnv("TBANK_PASSWORD"),
    apiUrl: (
      process.env.TBANK_API_URL?.trim() || "https://securepay.tinkoff.ru"
    ).replace(/\/$/, ""),
  };
}

export function getAppBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, "");
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, "")}`;
  }
  return "http://localhost:3000";
}

/** Temporary diagnostics for fetch failures — no secrets. */
export function getSafeFetchErrorDiagnostics(error: unknown): {
  name: string | null;
  message: string | null;
  causeCode: string | null;
  causeMessage: string | null;
} {
  if (!(error instanceof Error)) {
    return {
      name: null,
      message: String(error),
      causeCode: null,
      causeMessage: null,
    };
  }

  const cause = (error as Error & { cause?: unknown }).cause as
    | { code?: string; message?: string }
    | undefined;

  return {
    name: error.name || null,
    message: error.message || null,
    causeCode: cause?.code ? String(cause.code) : null,
    causeMessage: cause?.message ? String(cause.message).slice(0, 300) : null,
  };
}

async function tbankPost<T>(
  path: string,
  payload: Record<string, unknown>,
  logLabel: string
): Promise<T> {
  const { terminalKey, password, apiUrl } = getTbankConfig();
  const body: Record<string, unknown> = {
    ...payload,
    TerminalKey: terminalKey,
  };
  body.Token = buildTbankToken(body, password);

  let response: Response;
  try {
    response = await tbankFetch(`${apiUrl}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    const diag = getSafeFetchErrorDiagnostics(error);
    console.error(`[tbank-${logLabel}-fetch]`, diag);
    const err = new Error(diag.message || "fetch failed") as Error & {
      diagnostics?: typeof diag;
    };
    err.diagnostics = diag;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`T-Bank ${logLabel} HTTP ${response.status}`);
  }

  return (await response.json()) as T;
}

export async function initPayment(input: {
  amountKopecks: number;
  orderId: string;
  description: string;
  customer: CheckoutCustomer;
  lines: OrderLine[];
}): Promise<TbankInitResponse> {
  const baseUrl = getAppBaseUrl();
  const receipt = buildInitReceipt(
    input.customer,
    input.lines,
    input.amountKopecks
  );

  const data: Record<string, string> = {};
  if (receipt.Email) data.Email = receipt.Email;
  if (receipt.Phone) data.Phone = receipt.Phone;

  console.info("[tbank-init-receipt]", {
    orderId: input.orderId,
    ffdVersion: receipt.FfdVersion,
    taxation: receipt.Taxation,
    itemCount: receipt.Items.length,
    amountKopecks: input.amountKopecks,
    hasEmail: Boolean(receipt.Email),
    hasPhone: Boolean(receipt.Phone),
    paymentMethod: receipt.Items[0]?.PaymentMethod ?? null,
  });

  const payload: Record<string, unknown> = {
    Amount: input.amountKopecks,
    OrderId: input.orderId,
    Description: input.description.slice(0, 140),
    NotificationURL: `${baseUrl}/api/payments/notification`,
    SuccessURL: `${baseUrl}/payment/success?orderId=${encodeURIComponent(input.orderId)}`,
    FailURL: `${baseUrl}/payment/fail?orderId=${encodeURIComponent(input.orderId)}`,
    Language: "ru",
    Receipt: receipt,
  };
  if (Object.keys(data).length > 0) {
    payload.DATA = data;
  }

  return tbankPost<TbankInitResponse>("/v2/Init", payload, "init");
}

export async function getPaymentState(
  paymentId: string | number
): Promise<TbankGetStateResponse> {
  return tbankPost<TbankGetStateResponse>(
    "/v2/GetState",
    { PaymentId: String(paymentId) },
    "getstate"
  );
}

export async function checkOrder(
  orderId: string
): Promise<TbankCheckOrderResponse> {
  return tbankPost<TbankCheckOrderResponse>(
    "/v2/CheckOrder",
    { OrderId: String(orderId) },
    "checkorder"
  );
}

/**
 * Full cancel/refund. Per T-Bank, Receipt is omitted on a full cancel;
 * the kassa builds the return cheque from the original Init receipt.
 */
export async function cancelPayment(input: {
  paymentId: string | number;
  amountKopecks?: number;
}): Promise<TbankCancelResponse> {
  const payload: Record<string, unknown> = {
    PaymentId: String(input.paymentId),
  };
  if (input.amountKopecks != null) {
    payload.Amount = input.amountKopecks;
  }
  return tbankPost<TbankCancelResponse>("/v2/Cancel", payload, "cancel");
}

export async function sendClosingReceipt(input: {
  paymentId: string | number;
  customer: CheckoutCustomer;
  lines: OrderLine[];
  amountKopecks: number;
}): Promise<TbankClosingReceiptResponse> {
  const receipt = buildClosingReceipt(
    input.customer,
    input.lines,
    input.amountKopecks
  );

  console.info("[tbank-closing-receipt]", {
    paymentId: String(input.paymentId),
    ffdVersion: receipt.FfdVersion,
    itemCount: receipt.Items.length,
    amountKopecks: input.amountKopecks,
    paymentMethod: receipt.Items[0]?.PaymentMethod ?? null,
  });

  return tbankPost<TbankClosingReceiptResponse>(
    "/cashbox/SendClosingReceipt",
    {
      PaymentId: String(input.paymentId),
      Receipt: receipt,
    },
    "closing-receipt"
  );
}
