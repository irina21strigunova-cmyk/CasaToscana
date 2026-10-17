import { getProductById } from "@/lib/products";
import type { CartItem } from "@/types/product";
import type { CdekPackage } from "@/lib/cdek/types";

export class CdekCatalogWeightMissingError extends Error {
  readonly missing: string[];

  constructor(missing: string[]) {
    super(
      `Для расчёта СДЭК не задан вес: ${missing.join(", ")}. Без реального веса тариф не считаем.`
    );
    this.name = "CdekCatalogWeightMissingError";
    this.missing = missing;
  }
}

export function isCdekCatalogWeightMissingError(
  error: unknown
): error is CdekCatalogWeightMissingError {
  return error instanceof CdekCatalogWeightMissingError;
}

/**
 * Build CDEK packages from catalog data only.
 * Never invents weight or dimensions — missing weightGrams blocks calculation.
 */
export function buildCdekPackages(items: CartItem[]): CdekPackage[] {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("Корзина пуста");
  }

  const missing: string[] = [];
  const packages: CdekPackage[] = [];

  for (const item of items) {
    if (!item?.productId || !Number.isFinite(item.quantity) || item.quantity < 1) {
      throw new Error("Некорректная позиция корзины");
    }
    const product = getProductById(item.productId);
    if (!product) {
      throw new Error(`Товар не найден: ${item.productId}`);
    }

    const quantity = Math.floor(item.quantity);
    const weightGrams = product.weightGrams;
    if (!weightGrams || weightGrams < 1) {
      missing.push(product.name);
      continue;
    }

    const pack: CdekPackage = { weight: weightGrams * quantity };
    if (product.lengthMm && product.widthMm && product.heightMm) {
      pack.length = Math.ceil(product.lengthMm / 10);
      pack.width = Math.ceil(product.widthMm / 10);
      pack.height = Math.ceil(product.heightMm / 10) * quantity;
    }
    packages.push(pack);
  }

  if (missing.length > 0) {
    throw new CdekCatalogWeightMissingError(missing);
  }

  return packages;
}
