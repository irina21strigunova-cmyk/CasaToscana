"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";

export default function AdminLoginPage() {
  const router = useRouter();
  const [secret, setSecret] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        throw new Error(data.error || "Не удалось войти");
      }
      router.replace("/admin/orders");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка входа");
      setLoading(false);
    }
  }

  return (
    <div className="px-4 py-10">
      <h2 className="font-display text-2xl font-semibold">Вход для заказов</h2>
      <p className="mt-2 text-sm text-muted">
        Секрет не хранится в браузерном коде. Используйте тот же ключ, что и для
        операций Т-Банка.
      </p>
      <form className="mt-6 flex flex-col gap-3" onSubmit={handleSubmit}>
        <input
          type="password"
          value={secret}
          onChange={(event) => setSecret(event.target.value)}
          className="w-full rounded-2xl border border-foreground/10 bg-cream px-4 py-3 text-sm outline-none focus:border-olive/40"
          placeholder="Секрет администратора"
          autoComplete="current-password"
        />
        {error ? (
          <p className="text-sm text-terracotta-dark">{error}</p>
        ) : null}
        <Button type="submit" disabled={loading || !secret}>
          {loading ? "Входим…" : "Войти"}
        </Button>
      </form>
    </div>
  );
}
