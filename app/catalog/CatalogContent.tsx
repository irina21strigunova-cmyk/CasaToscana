"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ProductCard } from "@/components/product/ProductCard";
import { getCategories, getProducts } from "@/lib/products";
import { cn } from "@/lib/utils";

export function CatalogContent() {
  const searchParams = useSearchParams();
  const products = getProducts();
  const categories = getCategories();
  const requestedCategory = searchParams.get("category");
  const activeCategory =
    categories.find((cat) => cat.slug === requestedCategory)?.slug ??
    categories[0]?.slug;

  const filtered = useMemo(() => {
    if (!activeCategory) return products;
    return products.filter((p) => p.categorySlug === activeCategory);
  }, [activeCategory, products]);

  return (
    <div className="px-4 py-6">
      <div className="mb-6">
        <h2 className="font-display text-2xl font-semibold text-foreground">
          Каталог
        </h2>
        <p className="mt-1 text-sm text-muted">
          {filtered.length}{" "}
          {filtered.length === 1
            ? "товар"
            : filtered.length < 5
              ? "товара"
              : "товаров"}
        </p>
      </div>

      <div className="mb-6 flex flex-nowrap gap-2 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => (
          <Link
            key={cat.slug}
            href={`/catalog?category=${cat.slug}`}
            className={cn(
              "shrink-0 whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium transition-colors",
              activeCategory === cat.slug
                ? "bg-olive text-white"
                : "bg-cream text-muted hover:bg-milk-dark"
            )}
          >
            {cat.name}
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 items-stretch gap-3 md:grid-cols-3 lg:grid-cols-4">
        {filtered.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>

      {filtered.length === 0 && (
        <p className="py-12 text-center text-muted">
          В этой категории пока нет товаров.
        </p>
      )}
    </div>
  );
}
