import { catalogCategories } from "@/data/categories";
import productsData from "@/data/products.json";
import type { Product } from "@/types/product";

const products = productsData as Product[];

export function getProducts(): Product[] {
  return products;
}

export function getProductBySlug(slug: string): Product | undefined {
  return products.find((p) => p.slug === slug);
}

export function getFeaturedProducts(): Product[] {
  return products.filter((p) => p.featured);
}

export function getProductsByCategory(categorySlug: string): Product[] {
  return products.filter((p) => p.categorySlug === categorySlug);
}

export function getCategories(): { slug: string; name: string }[] {
  return catalogCategories;
}

export function formatPrice(price: number | null): string {
  if (price == null) {
    return "Цена уточняется";
  }

  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(price);
}

function shouldSkipFragment(fragment: string): boolean {
  const text = fragment.trim().toLowerCase();
  if (!text) return true;
  if (text.startsWith("на основе")) return true;
  if (text.startsWith("уход за руками")) return true;
  return false;
}

function labelForFragment(fragment: string): string {
  return fragment
    .trim()
    .replace(/^[✔️•\-\u2013\u2014\s]+/, "")
    .toLowerCase();
}

/** Short catalog line from the full `description`, e.g. "увлажняет и смягчает • питает • защищает". */
export function formatShortDescription(description: string): string {
  const fragments = description
    .split(/[.•;\n\u2013\u2014]+/)
    .map((part) => part.trim())
    .filter((part) => !shouldSkipFragment(part));

  const labels: string[] = [];
  const seen = new Set<string>();

  for (const fragment of fragments) {
    if (labels.length >= 3) break;
    const label = labelForFragment(fragment);
    if (!label || seen.has(label)) continue;
    seen.add(label);
    labels.push(label);
  }

  if (labels.length === 0) return "";

  const [first, ...rest] = labels;
  return [first.charAt(0).toUpperCase() + first.slice(1), ...rest].join(" • ");
}
