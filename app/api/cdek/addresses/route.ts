import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { listCdekOffices } from "@/lib/cdek/client";
import { pickupAddressesFromFeatures, pickupSearchBounds, type PhotonFeature } from "@/lib/cdek/pickup-search";

export const runtime = "nodejs";

const cachedOffices = unstable_cache(listCdekOffices, ["cdek-address-search-offices"], { revalidate: 300 });

/** Address lookup only. Does not create an order, payment, or shipment. */
export async function POST(request: Request) {
  try {
    const body = await request.json() as { cityCode?: number; cityName?: string; query?: string };
    const query = typeof body.query === "string" ? body.query.trim() : "";
    const cityName = typeof body.cityName === "string" ? body.cityName.trim() : "";
    if (!Number.isInteger(body.cityCode) || (body.cityCode ?? 0) < 1 || !cityName || cityName.length > 100 || query.length < 3 || query.length > 160) {
      return NextResponse.json({ ok: false, error: "Укажите город, улицу и дом" }, { status: 400 });
    }
    const bounds = pickupSearchBounds(await cachedOffices(body.cityCode as number));
    if (!bounds) throw new Error("СДЭК пока не передал координаты ПВЗ. Найдите пункт по названию улицы.");

    // Server-side proxy: do not pass customer contacts, browser location or IP to the geocoder.
    // Change provider without a client release via PHOTON_API_URL (compatible Photon API).
    const url = new URL(process.env.PHOTON_API_URL || "https://photon.komoot.io/api/");
    url.searchParams.set("q", `${cityName}, ${query}`);
    url.searchParams.set("limit", "6");
    url.searchParams.set("countrycode", "RU");
    url.searchParams.set("bbox", bounds.join(","));
    url.searchParams.append("layer", "house");
    url.searchParams.append("layer", "street");
    const response = await fetch(url, {
      headers: { "User-Agent": "CasaToscana/1.0 (https://casatoscana.ru)", "Accept-Language": "ru" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("Поиск адреса временно недоступен. Попробуйте ещё раз или выберите ПВЗ по улице.");
    const data = await response.json() as { features?: PhotonFeature[] };
    const addresses = pickupAddressesFromFeatures(Array.isArray(data.features) ? data.features : [], bounds);
    return NextResponse.json({ ok: true, addresses }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Не удалось найти адрес. Попробуйте ещё раз или выберите ПВЗ по улице." }, { status: 503 });
  }
}
