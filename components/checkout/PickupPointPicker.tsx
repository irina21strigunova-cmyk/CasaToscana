"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { filterPickupOffices, rankPickupOffices } from "@/lib/cdek/pickup-search";
import type { CdekCity, CdekOffice, PickupSearchAddress } from "@/lib/cdek/types";

interface Props {
  city: CdekCity;
  offices: CdekOffice[];
  value: string;
  loading: boolean;
  onChange: (code: string) => void;
}

export function PickupPointPicker({ city, offices, value, loading, onChange }: Props) {
  const inputId = useId();
  const [query, setQuery] = useState("");
  const [addresses, setAddresses] = useState<PickupSearchAddress[]>([]);
  const [point, setPoint] = useState<PickupSearchAddress | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [limit, setLimit] = useState(6);
  const activeRequest = useRef<AbortController | null>(null);
  useEffect(() => () => activeRequest.current?.abort(), []);

  const matches = useMemo(() => point
    ? rankPickupOffices(offices, point)
    : filterPickupOffices(offices, query).map(office => ({ ...office, distanceKm: undefined as number | undefined })),
  [offices, point, query]);
  const selected = offices.find(office => office.code === value);

  async function searchNearby() {
    if (query.trim().length < 3 || loading) return;
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setSearching(true);
    setPoint(null);
    setAddresses([]);
    setError("");
    setLimit(6);
    try {
      const response = await fetch("/api/cdek/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cityCode: city.code, cityName: city.name, query: query.trim() }),
        signal: controller.signal,
      });
      const data = await response.json() as { ok?: boolean; addresses?: PickupSearchAddress[]; error?: string };
      if (controller.signal.aborted) return;
      if (!response.ok || !data.ok) throw new Error(data.error || "Поиск адреса временно недоступен");
      const found = data.addresses ?? [];
      if (!found.length) {
        setError("Адрес не найден. Уточните улицу и дом или выберите пункт из списка ниже.");
      } else if (found.length === 1) {
        setPoint(found[0]);
      } else {
        setAddresses(found);
      }
    } catch (err) {
      if (!controller.signal.aborted) setError(err instanceof Error ? err.message : "Не удалось найти адрес");
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }

  return (
    <section className="mt-3" aria-label="Выбор пункта выдачи СДЭК">
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted">Пункт выдачи СДЭК</p>
      <label htmlFor={inputId} className="mb-1.5 block text-sm">Улица и дом</label>
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="pointer-events-none absolute left-3 top-3.5 h-5 w-5 text-olive/70">
            <circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />
          </svg>
          <input id={inputId} type="search" value={query} maxLength={160}
            placeholder="Например, Тверская, 7" autoComplete="off"
            aria-describedby={`${inputId}-hint`}
            className="w-full rounded-2xl border border-foreground/10 bg-milk py-3 pl-10 pr-3 text-sm outline-none focus:border-olive/50 focus:ring-2 focus:ring-olive/15"
            onChange={event => {
              activeRequest.current?.abort();
              setSearching(false);
              setQuery(event.target.value);
              setPoint(null);
              setAddresses([]);
              setError("");
              setLimit(6);
            }}
            onKeyDown={event => {
              if (event.key === "Enter") { event.preventDefault(); void searchNearby(); }
            }} />
        </div>
        <button type="button" onClick={() => void searchNearby()} disabled={query.trim().length < 3 || searching || loading}
          className="shrink-0 rounded-2xl bg-olive px-3 py-3 text-sm text-white disabled:opacity-45 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-olive">
          {searching ? "Ищем…" : "Найти рядом"}
        </button>
      </div>
      <p id={`${inputId}-hint`} className="mt-2 text-xs leading-relaxed text-muted">Введите адрес в городе {city.name} и нажмите «Найти рядом».</p>

      <div aria-live="polite" aria-atomic="true">
        {loading ? <p className="mt-3 text-sm text-muted">Загружаем пункты выдачи…</p> : null}
        {error ? <p className="mt-3 text-sm text-terracotta-dark">{error}</p> : null}
      </div>

      {addresses.length > 0 ? (
        <div className="mt-3 rounded-2xl border border-olive/20 bg-milk p-3">
          <p className="mb-2 text-sm font-medium">Уточните адрес</p>
          <ul className="divide-y divide-foreground/10">
            {addresses.map((item, i) => <li key={`${item.label}-${i}`}>
              <button type="button" className="w-full rounded-lg px-1 py-2.5 text-left text-sm hover:bg-cream focus-visible:outline-olive"
                onClick={() => { setPoint(item); setAddresses([]); setLimit(6); }}>
                {item.label}{item.precision === "street" ? <span className="block text-xs text-muted">Найдена улица, без точного дома</span> : null}
              </button>
            </li>)}
          </ul>
        </div>
      ) : null}

      {point ? <div className="mt-3 text-sm">
        <p className="font-medium">Ближайшие к адресу: {point.label}</p>
        <p className="mt-1 text-xs leading-relaxed text-muted">{point.precision === "street" ? "Точный дом не найден — расстояние от точки на улице. " : ""}Расстояние по прямой; пеший маршрут может быть длиннее.</p>
      </div> : null}

      {selected ? <div className="mt-3 rounded-2xl border border-olive/25 bg-olive/5 p-3 text-sm">
        <p className="text-xs font-medium uppercase tracking-wider text-olive">Выбранный ПВЗ</p>
        <p className="mt-1">{selected.address || selected.name}</p>
        {selected.workTime ? <p className="mt-1 text-xs text-muted">{selected.workTime}</p> : null}
      </div> : null}

      {!loading && !addresses.length ? <>
        <p className="mb-2 mt-3 text-xs text-muted" role="status">{point ? `Ближайшие пункты: ${matches.length}` : `Найдено пунктов: ${matches.length}`}</p>
        <ul className="max-h-80 space-y-2 overflow-y-auto overscroll-contain rounded-2xl pr-1">
          {matches.slice(0, limit).map(office => <li key={office.code}>
            <button type="button" aria-pressed={value === office.code} onClick={() => onChange(office.code)}
              className={`w-full rounded-2xl border p-3 text-left text-sm transition-colors focus-visible:outline-2 focus-visible:outline-olive ${value === office.code ? "border-olive bg-olive/10" : "border-foreground/10 bg-milk hover:border-olive/40"}`}>
              <span className="flex items-start justify-between gap-3">
                <span>{office.address || office.name}</span>
                {office.distanceKm !== undefined ? <span className="shrink-0 whitespace-nowrap text-xs font-medium text-olive">{office.distanceKm < 1 ? `${Math.round(office.distanceKm * 1000)} м` : `${office.distanceKm.toFixed(1)} км`}</span> : null}
              </span>
              {office.workTime ? <span className="mt-1.5 block text-xs text-muted">{office.workTime}</span> : null}
              {value === office.code ? <span className="mt-1.5 block text-xs font-medium text-olive">✓ Выбран</span> : null}
            </button>
          </li>)}
        </ul>
        {matches.length > limit ? <button type="button" className="mt-2 w-full rounded-xl py-2 text-sm text-olive underline underline-offset-4" onClick={() => setLimit(n => n + 12)}>Показать ещё</button> : null}
        {!matches.length ? <p className="mt-2 text-sm leading-relaxed text-muted">{query.trim() ? "На этой улице пунктов не найдено. Нажмите «Найти рядом», чтобы увидеть ПВЗ на соседних улицах." : "В этом городе пока нет доступных пунктов выдачи."}</p> : null}
      </> : null}

      {point || addresses.length ? <p className="mt-3 text-[11px] text-muted">Поиск адресов: © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer" className="underline">OpenStreetMap</a>, Photon</p> : null}
    </section>
  );
}
