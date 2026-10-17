import { NextResponse } from "next/server";
import { parseDeliveryType, quoteDelivery } from "@/lib/cdek/quote";
import type { CartItem } from "@/types/product";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface CalculateBody {
  type?: unknown;
  cityCode?: unknown;
  cityName?: unknown;
  cityRegion?: unknown;
  officeCode?: unknown;
  address?: unknown;
  items?: CartItem[];
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as CalculateBody;
    const type = parseDeliveryType(body.type);
    if (!type) {
      throw new Error("Выберите способ доставки");
    }

    const quote = await quoteDelivery({
      type,
      cityCode: typeof body.cityCode === "number" ? body.cityCode : undefined,
      cityName: typeof body.cityName === "string" ? body.cityName : undefined,
      cityRegion:
        typeof body.cityRegion === "string" ? body.cityRegion : undefined,
      officeCode:
        typeof body.officeCode === "string" ? body.officeCode : undefined,
      address: typeof body.address === "string" ? body.address : undefined,
      items: body.items ?? [],
    });

    return NextResponse.json({
      ok: true,
      delivery: quote.delivery,
      tariffs: quote.tariffs,
      awaitingQuote: quote.delivery.awaitingQuote === true,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось рассчитать доставку";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
