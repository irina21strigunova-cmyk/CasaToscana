import { createClient, type SupabaseClient } from "@supabase/supabase-js";

function normalizeSupabaseUrl(raw: string): string {
  const parsed = new URL(raw.trim());
  if (
    /supabase\.com\/dashboard/i.test(parsed.href) ||
    /\/dashboard(\/|$)/i.test(parsed.pathname)
  ) {
    throw new Error(
      "SUPABASE_URL должен быть Project URL вида https://xxxxx.supabase.co из Settings → API, не адрес кабинета Supabase."
    );
  }
  // supabase-js already appends /rest/v1; keep origin only.
  return parsed.origin;
}

export function isSupabaseConfigured(): boolean {
  try {
    const url = process.env.SUPABASE_URL?.trim();
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
    if (!url || !key) return false;
    normalizeSupabaseUrl(url);
    return true;
  } catch {
    return false;
  }
}

export function describeSupabaseError(error: { message?: string } | null | undefined): string {
  const message = error?.message?.trim() ?? "";
  if (!message) return "Не удалось сохранить заказ";
  if (message.includes("<!DOCTYPE") || message.includes("Looking for something")) {
    return "Supabase API недоступен. Проверьте SUPABASE_URL: нужен Project URL https://xxxxx.supabase.co, не страница кабинета.";
  }
  return message.slice(0, 300);
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!url || !key) {
    throw new Error("Supabase не настроен: нужны SUPABASE_URL и SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(normalizeSupabaseUrl(url), key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
