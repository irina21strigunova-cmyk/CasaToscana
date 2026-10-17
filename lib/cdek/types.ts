export type CdekDeliveryType =
  | "pvz"
  | "courier"
  | "stavropol_local"
  | "yandex_courier";

export interface CdekCity {
  code: number;
  name: string;
  region: string;
  country: string;
}

export interface CdekOffice {
  code: string;
  name: string;
  address: string;
  workTime: string | null;
  cityCode: number;
  latitude?: number;
  longitude?: number;
}

export interface PickupSearchAddress {
  label: string;
  latitude: number;
  longitude: number;
  precision: "house" | "street";
}

export interface CdekPackage {
  weight: number;
  length?: number;
  width?: number;
  height?: number;
}

export interface CdekTariffQuote {
  tariffCode: number;
  tariffName: string;
  deliverySumRub: number;
  periodMin: number | null;
  periodMax: number | null;
}

export interface DeliverySelection {
  type: CdekDeliveryType;
  cityCode?: number;
  cityName: string;
  officeCode?: string;
  officeName?: string;
  officeAddress?: string;
  address?: string;
  tariffCode?: number;
  tariffName?: string;
  costRub: number;
  awaitingQuote?: boolean;
}

export interface DeliveryQuoteResult {
  delivery: DeliverySelection;
  tariffs: CdekTariffQuote[];
}
