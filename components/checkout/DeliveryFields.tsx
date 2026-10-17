"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { CartItem } from "@/types/product";
import type {
  CdekCity,
  CdekDeliveryType,
  CdekOffice,
  DeliverySelection,
} from "@/lib/cdek/types";
import { formatPrice } from "@/lib/products";
import { PickupPointPicker } from "./PickupPointPicker";

export interface DeliveryPayload {
  type: CdekDeliveryType;
  cityCode?: number;
  cityName: string;
  cityRegion?: string;
  officeCode?: string;
  address?: string;
  expectedCostRub: number;
  awaitingQuote?: boolean;
}

interface DeliveryFieldsProps {
  items: CartItem[];
  goodsTotal: number;
  onChange: (payload: DeliveryPayload | null) => void;
}

export function DeliveryFields({
  items,
  goodsTotal,
  onChange,
}: DeliveryFieldsProps) {
  const [query, setQuery] = useState("");
  const [cities, setCities] = useState<
    Array<CdekCity & { stavropolLocal?: boolean }>
  >([]);
  const [city, setCity] = useState<
    (CdekCity & { stavropolLocal?: boolean }) | null
  >(null);
  const [type, setType] = useState<CdekDeliveryType>("pvz");
  const [offices, setOffices] = useState<CdekOffice[]>([]);
  const [officesLoading, setOfficesLoading] = useState(false);
  const [officeCode, setOfficeCode] = useState("");
  const [address, setAddress] = useState("");
  const [quote, setQuote] = useState<DeliverySelection | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const itemsKey = useMemo(() => JSON.stringify(items), [items]);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setCities([]);
      return;
    }
    const timer = window.setTimeout(() => {
      void (async () => {
        try {
          const response = await fetch(
            `/api/cdek/cities?q=${encodeURIComponent(q)}`
          );
          const data = (await response.json()) as {
            ok?: boolean;
            cities?: Array<CdekCity & { stavropolLocal?: boolean }>;
          };
          setCities(data.ok ? data.cities ?? [] : []);
        } catch {
          setCities([]);
        }
      })();
    }, 300);
    return () => window.clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    if (!city || city.stavropolLocal || type !== "pvz") {
      setOffices([]);
      setOfficesLoading(false);
      return;
    }
    const controller = new AbortController();
    setOffices([]);
    setOfficesLoading(true);
    void (async () => {
      try {
        const response = await fetch(
          `/api/cdek/offices?cityCode=${encodeURIComponent(String(city.code))}`,
          { signal: controller.signal }
        );
        const data = (await response.json()) as {
          ok?: boolean;
          offices?: CdekOffice[];
          error?: string;
        };
        if (!response.ok || !data.ok) {
          throw new Error(data.error || "Не удалось загрузить ПВЗ");
        }
        if (!controller.signal.aborted) setOffices(data.offices ?? []);
      } catch (err) {
        if (controller.signal.aborted) return;
        setOffices([]);
        setError(err instanceof Error ? err.message : "Ошибка ПВЗ");
      } finally {
        if (!controller.signal.aborted) setOfficesLoading(false);
      }
    })();
    return () => controller.abort();
  }, [city, type]);

  useEffect(() => {
    // A newly selected city/PVZ must be quoted before checkout can use it.
    setQuote(null);
    onChangeRef.current(null);
    setLoading(false);
    if (!city) {
      return;
    }

    const deliveryType: CdekDeliveryType = city.stavropolLocal
      ? "stavropol_local"
      : type;
    if (deliveryType === "pvz" && !officeCode) {
      setQuote(null);
      onChangeRef.current(null);
      return;
    }
    if (deliveryType === "courier" && address.trim().length < 8) {
      setQuote(null);
      onChangeRef.current(null);
      return;
    }

    const controller = new AbortController();
    setLoading(true);
    const timer = window.setTimeout(() => {
      void (async () => {
        setLoading(true);
        setError(null);
        try {
          const response = await fetch("/api/cdek/calculate", {
            method: "POST",
            signal: controller.signal,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: deliveryType,
              cityCode: city.code,
              cityName: city.name,
              cityRegion: city.region,
              officeCode: deliveryType === "pvz" ? officeCode : undefined,
              address: deliveryType === "courier" ? address : undefined,
              items,
            }),
          });
          const data = (await response.json()) as {
            ok?: boolean;
            delivery?: DeliverySelection;
            error?: string;
          };
          if (!response.ok || !data.ok || !data.delivery) {
            throw new Error(data.error || "Не удалось рассчитать доставку");
          }
          if (controller.signal.aborted) return;
          setQuote(data.delivery);
          onChangeRef.current({
            type: data.delivery.type,
            cityCode: data.delivery.cityCode,
            cityName: data.delivery.cityName,
            cityRegion: city.region,
            officeCode: data.delivery.officeCode,
            address: data.delivery.address,
            expectedCostRub: data.delivery.costRub,
            awaitingQuote: data.delivery.awaitingQuote === true,
          });
        } catch (err) {
          if (controller.signal.aborted) return;
          setQuote(null);
          onChangeRef.current(null);
          setError(
            err instanceof Error ? err.message : "Не удалось рассчитать доставку"
          );
        } finally {
          if (!controller.signal.aborted) setLoading(false);
        }
      })();
    }, 400);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [address, city, items, itemsKey, officeCode, type]);

  return (
    <div className="mt-6 rounded-2xl bg-cream p-4">
      <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-olive/75">
        Доставка
      </p>

      <label className="mt-3 block">
        <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
          Город
        </span>
        <input
          value={city ? `${city.name}${city.region ? `, ${city.region}` : ""}` : query}
          onChange={(event) => {
            setCity(null);
            setOfficeCode("");
            setQuote(null);
            setQuery(event.target.value);
          }}
          className="w-full rounded-2xl border border-foreground/10 bg-milk px-4 py-3 text-sm outline-none focus:border-olive/40"
          placeholder="Начните вводить город"
          autoComplete="address-level2"
        />
      </label>

      {!city && cities.length > 0 ? (
        <ul className="mt-2 overflow-hidden rounded-2xl border border-foreground/10 bg-milk">
          {cities.map((item) => (
            <li key={item.code}>
              <button
                type="button"
                className="w-full px-4 py-2.5 text-left text-sm hover:bg-cream"
                onClick={() => {
                  setCity(item);
                  setQuery("");
                  setCities([]);
                  setOfficeCode("");
                  if (item.stavropolLocal) setType("stavropol_local");
                  else if (type === "stavropol_local") setType("pvz");
                }}
              >
                {item.name}
                {item.region ? (
                  <span className="text-muted"> · {item.region}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {city && !city.stavropolLocal ? (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            className={`rounded-2xl px-3 py-2 text-sm ${
              type === "pvz" ? "bg-olive text-white" : "bg-milk text-foreground"
            }`}
            onClick={() => {
              setType("pvz");
              setAddress("");
            }}
          >
            Пункт выдачи
          </button>
          <button
            type="button"
            className={`rounded-2xl px-3 py-2 text-sm ${
              type === "courier" ? "bg-olive text-white" : "bg-milk text-foreground"
            }`}
            onClick={() => {
              setType("courier");
              setOfficeCode("");
            }}
          >
            Курьер
          </button>
        </div>
      ) : null}

      {city?.stavropolLocal ? (
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Доставка по Ставрополю согласовывается отдельно и в этом заказе не
          добавляется к сумме СДЭК. В оплату входят только товары.
        </p>
      ) : null}

      {city && type === "pvz" && !city.stavropolLocal ? (
        <PickupPointPicker key={city.code} city={city} offices={offices}
          value={officeCode} loading={officesLoading} onChange={setOfficeCode} />
      ) : null}

      {city && type === "courier" && !city.stavropolLocal ? (
        <label className="mt-3 block">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-[0.14em] text-muted">
            Адрес доставки
          </span>
          <textarea
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            className="min-h-[5rem] w-full resize-none rounded-2xl border border-foreground/10 bg-milk px-4 py-3 text-sm outline-none focus:border-olive/40"
            placeholder="Улица, дом, квартира"
          />
        </label>
      ) : null}

      {loading ? (
        <p className="mt-3 text-sm text-muted">Считаем доставку через СДЭК…</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm text-terracotta-dark">{error}</p>
      ) : null}

      {quote ? (
        <div className="mt-4 flex flex-col gap-1 border-t border-foreground/10 pt-3 text-sm">
          {quote.awaitingQuote ? (
            <p className="mb-2 leading-relaxed text-foreground">
              Стоимость доставки будет рассчитана после оформления заказа
            </p>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted">Товары</span>
            <span>{formatPrice(goodsTotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">Доставка</span>
            <span>
              {quote.awaitingQuote
                ? "после оформления"
                : quote.costRub > 0
                  ? formatPrice(quote.costRub)
                  : "не в сумме"}
            </span>
          </div>
          {quote.awaitingQuote ? null : (
            <div className="mt-1 flex justify-between font-medium">
              <span>Итого к оплате</span>
              <span>{formatPrice(goodsTotal + quote.costRub)}</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
