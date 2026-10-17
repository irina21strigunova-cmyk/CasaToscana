import { getCdekApiBaseUrl, getCdekFromLocation } from "@/lib/cdek/config";
import type {
  CdekCity,
  CdekOffice,
  CdekPackage,
  CdekTariffQuote,
} from "@/lib/cdek/types";

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

const globalCdek = globalThis as typeof globalThis & {
  __casaToscanaCdekToken?: TokenCache;
};

function requireCdekCredentials(): { clientId: string; clientSecret: string } {
  const clientId = process.env.CDEK_CLIENT_ID?.trim();
  const clientSecret = process.env.CDEK_CLIENT_SECRET?.trim();
  if (!clientId || !clientSecret) {
    throw new Error("Не заданы переменные CDEK_CLIENT_ID / CDEK_CLIENT_SECRET");
  }
  return { clientId, clientSecret };
}

async function getAccessToken(): Promise<string> {
  const cached = globalCdek.__casaToscanaCdekToken;
  if (cached && Date.now() < cached.expiresAt - 60_000) {
    return cached.accessToken;
  }

  const { clientId, clientSecret } = requireCdekCredentials();
  const response = await fetch(`${getCdekApiBaseUrl()}/v2/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: clientId,
      client_secret: clientSecret,
    }),
    cache: "no-store",
  });

  const json = (await response.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };

  if (!response.ok || !json.access_token) {
    console.error("[cdek-oauth]", {
      http: response.status,
      error: json.error ?? null,
    });
    throw new Error("Не удалось авторизоваться в API СДЭК");
  }

  globalCdek.__casaToscanaCdekToken = {
    accessToken: json.access_token,
    expiresAt: Date.now() + Math.max(30, json.expires_in ?? 3600) * 1000,
  };
  return json.access_token;
}

async function cdekRequest<T>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${getCdekApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
    cache: "no-store",
  });

  const json = (await response.json()) as T & {
    errors?: Array<{ message?: string }>;
    requests?: Array<{ errors?: Array<{ message?: string }> }>;
  };

  const apiError =
    json.errors?.[0]?.message || json.requests?.[0]?.errors?.[0]?.message;
  if (!response.ok || apiError) {
    console.error("[cdek-api]", { path, http: response.status });
    throw new Error(apiError || `СДЭК HTTP ${response.status}`);
  }

  return json;
}

interface CdekCityRaw {
  code?: number;
  city?: string;
  region?: string;
  country?: string;
  country_code?: string;
}

export async function searchCdekCities(query: string): Promise<CdekCity[]> {
  const city = query.trim();
  if (city.length < 2) return [];

  const params = new URLSearchParams({
    country_codes: "RU",
    city,
    size: "20",
    page: "0",
  });
  const raw = await cdekRequest<CdekCityRaw[]>(
    `/v2/location/cities?${params.toString()}`
  );
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => typeof item.code === "number" && item.city)
    .map((item) => ({
      code: item.code as number,
      name: String(item.city),
      region: String(item.region ?? ""),
      country: String(item.country ?? "Россия"),
    }));
}

interface CdekOfficeRaw {
  code?: string;
  name?: string;
  location?: {
    address_full?: string;
    address?: string;
    city_code?: number;
  };
  work_time?: string;
  type?: string;
}

export async function listCdekOffices(cityCode: number): Promise<CdekOffice[]> {
  const params = new URLSearchParams({
    city_code: String(cityCode),
    type: "PVZ",
    is_handout: "true",
  });
  const raw = await cdekRequest<CdekOfficeRaw[]>(
    `/v2/deliverypoints?${params.toString()}`
  );
  if (!Array.isArray(raw)) return [];

  return raw
    .filter((item) => item.code)
    .map((item) => ({
      code: String(item.code),
      name: String(item.name ?? item.code),
      address: String(
        item.location?.address_full || item.location?.address || ""
      ),
      workTime: item.work_time ?? null,
      cityCode: item.location?.city_code ?? cityCode,
    }));
}

interface CdekTariffListResponse {
  tariff_codes?: Array<{
    tariff_code?: number;
    tariff_name?: string;
    delivery_mode?: number;
    delivery_sum?: number;
    period_min?: number;
    period_max?: number;
  }>;
  errors?: Array<{ message?: string }>;
}

function mapTariffs(
  raw: CdekTariffListResponse,
  deliveryMode: number
): CdekTariffQuote[] {
  const list = raw.tariff_codes ?? [];
  return list
    .filter(
      (item) =>
        item.tariff_code != null &&
        item.delivery_mode === deliveryMode &&
        typeof item.delivery_sum === "number"
    )
    .map((item) => ({
      tariffCode: item.tariff_code as number,
      tariffName: String(item.tariff_name ?? `Тариф ${item.tariff_code}`),
      deliverySumRub: item.delivery_sum as number,
      periodMin: item.period_min ?? null,
      periodMax: item.period_max ?? null,
    }))
    .sort((a, b) => a.deliverySumRub - b.deliverySumRub);
}

export async function calculateCdekTariffs(input: {
  cityCode: number;
  address?: string;
  packages: CdekPackage[];
  toPvz: boolean;
}): Promise<CdekTariffQuote[]> {
  const from = getCdekFromLocation();
  const toLocation: Record<string, unknown> = { code: input.cityCode };
  if (!input.toPvz && input.address?.trim()) {
    toLocation.address = input.address.trim();
  }

  const payload = {
    type: 1,
    from_location: from,
    to_location: toLocation,
    packages: input.packages,
  };

  const raw = await cdekRequest<CdekTariffListResponse>(
    "/v2/calculator/tarifflist",
    { method: "POST", body: JSON.stringify(payload) }
  );

  if (raw.errors?.length) {
    throw new Error(raw.errors[0]?.message || "СДЭК не смог рассчитать тариф");
  }

  // 4 = склад-склад (ПВЗ), 3 = склад-дверь (курьер)
  const mode = input.toPvz ? 4 : 3;
  const tariffs = mapTariffs(raw, mode);
  if (tariffs.length === 0) {
    throw new Error(
      input.toPvz
        ? "Нет тарифа СДЭК до пункта выдачи для этого города"
        : "Нет тарифа СДЭК курьером для этого города"
    );
  }
  return tariffs;
}
