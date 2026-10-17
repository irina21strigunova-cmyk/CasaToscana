/** Official CDEK location code for Moscow — used as shipment origin city. */
export const CDEK_MOSCOW_CODE = 44;

const STAVROPOL_NAME = /ставропол/i;

export function getCdekApiBaseUrl(): string {
  return (
    process.env.CDEK_API_BASE_URL?.trim() || "https://api.cdek.ru"
  ).replace(/\/$/, "");
}

export function getCdekFromLocation(): { code: number; address?: string } {
  const codeRaw = process.env.CDEK_FROM_LOCATION_CODE?.trim();
  const code = codeRaw ? Number(codeRaw) : CDEK_MOSCOW_CODE;
  const address = process.env.CDEK_FROM_ADDRESS?.trim();
  return address ? { code, address } : { code };
}

export function isStavropolCity(input: {
  name?: string | null;
  region?: string | null;
}): boolean {
  return STAVROPOL_NAME.test(input.name ?? "") || STAVROPOL_NAME.test(input.region ?? "");
}
