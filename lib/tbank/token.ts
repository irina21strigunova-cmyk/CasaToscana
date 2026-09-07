import { createHash } from "node:crypto";

/**
 * T-Bank acquiring request/notification Token (SHA-256).
 * @see https://developer.tbank.ru/eacq/intro/developer/token
 */
export function buildTbankToken(
  params: Record<string, unknown>,
  password: string
): string {
  const pairs: { key: string; value: string }[] = [];

  for (const [key, value] of Object.entries(params)) {
    if (key === "Token") continue;
    if (value === undefined || value === null) continue;
    if (typeof value === "object") continue;
    pairs.push({ key, value: String(value) });
  }

  pairs.push({ key: "Password", value: password });
  pairs.sort((a, b) => (a.key < b.key ? -1 : a.key > b.key ? 1 : 0));

  const concatenated = pairs.map((p) => p.value).join("");
  return createHash("sha256").update(concatenated, "utf8").digest("hex");
}

export function verifyTbankToken(
  params: Record<string, unknown>,
  password: string
): boolean {
  const received = params.Token;
  if (typeof received !== "string" || !received) return false;
  const expected = buildTbankToken(params, password);
  return expected.toLowerCase() === received.toLowerCase();
}
