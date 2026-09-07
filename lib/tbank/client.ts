import { buildTbankToken } from "@/lib/tbank/token";
import type {
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

export async function initPayment(input: {
  amountKopecks: number;
  orderId: string;
  description: string;
  customerEmail?: string;
  customerPhone?: string;
}): Promise<TbankInitResponse> {
  const { terminalKey, password, apiUrl } = getTbankConfig();
  const baseUrl = getAppBaseUrl();

  const body: Record<string, unknown> = {
    TerminalKey: terminalKey,
    Amount: input.amountKopecks,
    OrderId: input.orderId,
    Description: input.description.slice(0, 140),
    NotificationURL: `${baseUrl}/api/payments/notification`,
    SuccessURL: `${baseUrl}/payment/success?orderId=${encodeURIComponent(input.orderId)}`,
    FailURL: `${baseUrl}/payment/fail?orderId=${encodeURIComponent(input.orderId)}`,
    Language: "ru",
  };

  const data: Record<string, string> = {};
  if (input.customerEmail) data.Email = input.customerEmail;
  if (input.customerPhone) data.Phone = input.customerPhone;
  if (Object.keys(data).length > 0) {
    body.DATA = data;
  }

  body.Token = buildTbankToken(body, password);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v2/Init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    const diag = getSafeFetchErrorDiagnostics(error);
    console.error("[tbank-init-fetch]", diag);
    const err = new Error(diag.message || "fetch failed") as Error & {
      diagnostics?: typeof diag;
    };
    err.diagnostics = diag;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`T-Bank Init HTTP ${response.status}`);
  }

  return (await response.json()) as TbankInitResponse;
}

export async function getPaymentState(
  paymentId: string | number
): Promise<TbankGetStateResponse> {
  const { terminalKey, password, apiUrl } = getTbankConfig();

  const body: Record<string, unknown> = {
    TerminalKey: terminalKey,
    PaymentId: String(paymentId),
  };
  body.Token = buildTbankToken(body, password);

  let response: Response;
  try {
    response = await fetch(`${apiUrl}/v2/GetState`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
  } catch (error) {
    const diag = getSafeFetchErrorDiagnostics(error);
    console.error("[tbank-getstate-fetch]", diag);
    const err = new Error(diag.message || "fetch failed") as Error & {
      diagnostics?: typeof diag;
    };
    err.diagnostics = diag;
    throw err;
  }

  if (!response.ok) {
    throw new Error(`T-Bank GetState HTTP ${response.status}`);
  }

  return (await response.json()) as TbankGetStateResponse;
}
