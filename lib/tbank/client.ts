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
    SuccessURL: `${baseUrl}/payment/success`,
    FailURL: `${baseUrl}/payment/fail`,
    Language: "ru",
  };

  const data: Record<string, string> = {};
  if (input.customerEmail) data.Email = input.customerEmail;
  if (input.customerPhone) data.Phone = input.customerPhone;
  if (Object.keys(data).length > 0) {
    body.DATA = data;
  }

  body.Token = buildTbankToken(body, password);

  const response = await fetch(`${apiUrl}/v2/Init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

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

  const response = await fetch(`${apiUrl}/v2/GetState`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`T-Bank GetState HTTP ${response.status}`);
  }

  return (await response.json()) as TbankGetStateResponse;
}
