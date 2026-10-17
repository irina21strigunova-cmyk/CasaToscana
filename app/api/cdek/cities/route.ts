import { NextResponse } from "next/server";
import { searchCdekCities } from "@/lib/cdek/client";
import { isStavropolCity } from "@/lib/cdek/config";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q")?.trim() ?? "";
    const cities = await searchCdekCities(q);
    return NextResponse.json({
      ok: true,
      cities: cities.map((city) => ({
        ...city,
        stavropolLocal: isStavropolCity(city),
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось найти города";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
