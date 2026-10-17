import { createHmac, timingSafeEqual } from "node:crypto";

export const OPS_COOKIE_NAME = "ct_ops_session";
const COOKIE_TTL_SECONDS = 60 * 60 * 12;

function getOpsSecret(): string | null {
  return process.env.TBANK_OPS_SECRET?.trim() || null;
}

function secretsEqual(left: string, right: string): boolean {
  const a = Buffer.from(left);
  const b = Buffer.from(right);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function sign(value: string, secret: string): string {
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function createOpsSessionCookie(secretInput: string): string | null {
  const secret = getOpsSecret();
  if (!secret || !secretsEqual(secretInput, secret)) return null;
  const exp = Math.floor(Date.now() / 1000) + COOKIE_TTL_SECONDS;
  const payload = `v1.${exp}`;
  return `${payload}.${sign(payload, secret)}`;
}

export function readOpsSessionCookie(cookieHeader: string | null): boolean {
  const secret = getOpsSecret();
  if (!secret || !cookieHeader) return false;
  const match = cookieHeader
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${OPS_COOKIE_NAME}=`));
  if (!match) return false;
  const token = decodeURIComponent(match.slice(OPS_COOKIE_NAME.length + 1));
  const parts = token.split(".");
  if (parts.length !== 3 || parts[0] !== "v1") return false;
  const payload = `${parts[0]}.${parts[1]}`;
  const expected = sign(payload, secret);
  if (!secretsEqual(parts[2], expected)) return false;
  const exp = Number(parts[1]);
  if (!Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) {
    return false;
  }
  return true;
}

export function opsCookieHeader(token: string, clear = false): string {
  const secure = process.env.VERCEL ? "; Secure" : "";
  if (clear) {
    return `${OPS_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${secure}`;
  }
  return `${OPS_COOKIE_NAME}=${encodeURIComponent(token)}; Path=/; Max-Age=${COOKIE_TTL_SECONDS}; HttpOnly; SameSite=Lax${secure}`;
}

export function isOpsAuthorized(request: Request): boolean {
  const secret = getOpsSecret();
  if (!secret) return false;

  const header = request.headers.get("authorization");
  const bearer = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : "";
  const provided = bearer || request.headers.get("x-ops-secret")?.trim() || "";
  if (provided && secretsEqual(provided, secret)) return true;

  return readOpsSessionCookie(request.headers.get("cookie"));
}
