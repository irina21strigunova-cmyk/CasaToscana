import { getProductById } from "@/lib/products";
import type { Product, CartItem } from "@/types/product";
import type { CdekPackage } from "@/lib/cdek/types";

/**
 * These are conservative SHIPPING ESTIMATES, not measured product specifications.
 * Transport cartons and protective fill are part of the estimate.
 * Do not display estimated weight as a verified product characteristic.
 */
const DEFAULT_CONTENT_GRAMS = 350;
const PER_ITEM_PACKAGING_GRAMS = 140;
const CARTON_PACKING_GRAMS = 250;
const MAX_ESTIMATED_CONTENT_GRAMS_PER_CARTON = 3000;

export class CdekCatalogWeightMissingError extends Error {
  readonly missing: string[];
  constructor(missing: string[]) {
    super(`Невозможно оценить упаковку: ${missing.join(", ")}`);
    this.name = "CdekCatalogWeightMissingError";
    this.missing = missing;
  }
}

export function isCdekCatalogWeightMissingError(
  error: unknown
): error is CdekCatalogWeightMissingError {
  return error instanceof CdekCatalogWeightMissingError;
}

function approximateContentGrams(product: Product): number {
  if (product.weightGrams && product.weightGrams > 0) {
    return product.weightGrams;
  }
  const volume = product.volume?.trim().toLowerCase().replace(",", ".");
  const match = volume?.match(/(\d+(?:\.\d+)?)\s*(мл|ml|л|литр(?:а|ов)?|г|гр|kg|кг)\b/u);
  if (!match) return DEFAULT_CONTENT_GRAMS;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return DEFAULT_CONTENT_GRAMS;
  const unit = match[2];
  const grams = unit === "л" || unit.startsWith("литр")
    ? amount * 1200
    : unit === "кг" || unit === "kg"
      ? amount * 1000
      : unit === "г" || unit === "гр"
        ? amount
        : amount * 1.2; // 1.2 g/ml: deliberately conservative for cosmetic liquids
  return Math.max(30, Math.ceil(grams));
}

/** Estimate one or more complete outer cartons; CDEK dimensions are in cm. */
export function buildCdekPackages(items: CartItem[]): CdekPackage[] {
  if (!Array.isArray(items) || items.length === 0) throw new Error("Корзина пуста");
  const unitWeights: number[] = [];
  for (const item of items) {
    if (!item?.productId || !Number.isInteger(item.quantity) ||
        item.quantity < 1 || item.quantity > 100) {
      throw new Error("Некорректное количество в корзине");
    }
    const product = getProductById(item.productId);
    if (!product) throw new Error(`Товар не найден: ${item.productId}`);
    for (let i = 0; i < item.quantity; i++) {
      unitWeights.push(approximateContentGrams(product) + PER_ITEM_PACKAGING_GRAMS);
    }
  }

  const cartons: number[] = [];
  let cartonWeight = 0;
  for (const weight of unitWeights) {
    if (cartonWeight && cartonWeight + weight > MAX_ESTIMATED_CONTENT_GRAMS_PER_CARTON) {
      cartons.push(cartonWeight);
      cartonWeight = 0;
    }
    cartonWeight += weight;
    if (cartonWeight > MAX_ESTIMATED_CONTENT_GRAMS_PER_CARTON) {
      cartons.push(cartonWeight);
      cartonWeight = 0;
    }
  }
  if (cartonWeight) cartons.push(cartonWeight);

  return cartons.map((weight) => {
    const total = weight + CARTON_PACKING_GRAMS;
    // Standardized conservative outer box sizes, not actual measured cartons.
    const dims = total <= 1100 ? [25, 20, 15]
      : total <= 2400 ? [35, 25, 20] : [40, 30, 25];
    return { weight: total, length: dims[0], width: dims[1], height: dims[2] };
  });
}
