import { NextResponse } from "next/server";
import { listCdekOffices } from "@/lib/cdek/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const cityCode = Number(searchParams.get("cityCode"));
    if (!Number.isInteger(cityCode) || cityCode < 1) {
      throw new Error("Нужен код города");
    }
    const offices = await listCdekOffices(cityCode);
    return NextResponse.json({ ok: true, offices });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Не удалось загрузить пункты выдачи";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
