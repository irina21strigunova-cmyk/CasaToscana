import {
  calculateCdekTariffs,
  listCdekOffices,
} from "@/lib/cdek/client";
import { isStavropolCity } from "@/lib/cdek/config";
import {
  buildCdekPackages,
  isCdekCatalogWeightMissingError,
} from "@/lib/cdek/packages";
import type {
  CdekDeliveryType,
  DeliveryQuoteResult,
  DeliverySelection,
} from "@/lib/cdek/types";
import type { CartItem } from "@/types/product";

export interface DeliveryQuoteInput {
  type: CdekDeliveryType;
  cityCode?: number;
  cityName?: string;
  cityRegion?: string;
  officeCode?: string;
  address?: string;
  items: CartItem[];
}

export function parseDeliveryType(
  value: unknown
): CdekDeliveryType | null {
  if (value === "pvz" || value === "courier" || value === "stavropol_local") {
    return value;
  }
  return null;
}

async function resolveDestination(
  input: DeliveryQuoteInput
): Promise<DeliverySelection> {
  const cityName = input.cityName?.trim() ?? "";
  if (!input.cityCode) {
    throw new Error("Выберите город доставки");
  }
  if (input.type !== "pvz" && input.type !== "courier") {
    throw new Error("Выберите способ доставки СДЭК");
  }

  const delivery: DeliverySelection = {
    type: input.type,
    cityCode: input.cityCode,
    cityName,
    costRub: 0,
  };

  if (input.type === "pvz") {
    const officeCode = input.officeCode?.trim();
    if (!officeCode) {
      throw new Error("Выберите пункт выдачи СДЭК");
    }
    const offices = await listCdekOffices(input.cityCode);
    const office = offices.find((item) => item.code === officeCode);
    if (!office) {
      throw new Error("Выбранный пункт выдачи недоступен");
    }
    delivery.officeCode = office.code;
    delivery.officeName = office.name;
    delivery.officeAddress = office.address;
  } else {
    const address = input.address?.trim() ?? "";
    if (address.length < 8) {
      throw new Error("Укажите полный адрес для курьерской доставки");
    }
    delivery.address = address;
  }

  return delivery;
}

export async function quoteDelivery(
  input: DeliveryQuoteInput
): Promise<DeliveryQuoteResult> {
  const cityName = input.cityName?.trim() ?? "";
  if (input.type === "stavropol_local" || isStavropolCity({ name: cityName, region: input.cityRegion })) {
    const delivery: DeliverySelection = {
      type: "stavropol_local",
      cityCode: input.cityCode,
      cityName: cityName || "Ставрополь",
      costRub: 0,
    };
    return { delivery, tariffs: [] };
  }

  const delivery = await resolveDestination(input);

  try {
    const packages = buildCdekPackages(input.items);
    const tariffs = await calculateCdekTariffs({
      cityCode: delivery.cityCode as number,
      address: delivery.address,
      packages,
      toPvz: delivery.type === "pvz",
    });
    const best = tariffs[0];
    return {
      delivery: {
        ...delivery,
        tariffCode: best.tariffCode,
        tariffName: best.tariffName,
        costRub: best.deliverySumRub,
        awaitingQuote: false,
      },
      tariffs,
    };
  } catch (error) {
    if (isCdekCatalogWeightMissingError(error)) {
      return {
        delivery: { ...delivery, costRub: 0, awaitingQuote: true },
        tariffs: [],
      };
    }
    throw error;
  }
}
