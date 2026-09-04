"use client";

import Link from "next/link";
import { ProductCard } from "@/components/product/ProductCard";
import type { Product } from "@/types/product";

interface FeaturedProductsProps {
  products: Product[];
}

export function FeaturedProducts({ products }: FeaturedProductsProps) {
  return (
    <section className="px-5">
      <div className="mb-7 flex items-end justify-between">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.3em] text-olive/80">
            Избранное
          </p>
          <h2 className="font-display mt-2 text-[1.75rem] font-light leading-tight text-foreground">
            Для особых моментов
          </h2>
        </div>
        <Link
          href="/catalog"
          className="mb-1 text-[12px] font-medium uppercase tracking-[0.15em] text-terracotta"
        >
          Все →
        </Link>
      </div>

      <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-2 scrollbar-none md:gap-4">
        {products.map((product) => (
          <div
            key={product.id}
            className="w-[10.5rem] shrink-0 sm:w-[12rem] md:w-[13.5rem] lg:w-[14.5rem]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>
    </section>
  );
}
