"use client";

import Link from "next/link";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import { formatPrice, formatShortDescription } from "@/lib/products";
import { cn } from "@/lib/utils";
import type { Product } from "@/types/product";

interface ProductCardProps {
  product: Product;
  className?: string;
}

export function ProductCard({ product, className }: ProductCardProps) {
  const hasImage = Boolean(product.image);
  const shortDescription = formatShortDescription(product.description ?? "");
  const title = product.volume
    ? `${product.name} ${product.volume}`
    : product.name;
  const hasPrice = product.price != null;

  return (
    <article
      className={cn(
        "flex h-full min-w-0 flex-col overflow-hidden rounded-2xl bg-cream shadow-sm",
        className
      )}
    >
      <Link
        href={`/catalog/${product.slug}`}
        prefetch={false}
        aria-label={title}
        className="relative aspect-[2/3] w-full shrink-0 overflow-hidden bg-milk"
      >
        {hasImage ? (
          <img
            src={encodeURI(product.image!)}
            alt={title}
            className="absolute inset-0 h-full w-full object-cover"
          />
        ) : (
          <div
            className="absolute inset-0"
            style={{ backgroundColor: product.imageColor }}
          />
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col px-3 pb-3 pt-2.5">
        <h3 className="font-display line-clamp-2 break-words text-[15px] font-semibold leading-snug text-foreground sm:text-base">
          <Link href={`/catalog/${product.slug}`} prefetch={false} className="hover:underline">
            {title}
          </Link>
        </h3>

        {shortDescription ? (
          <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted">
            {shortDescription}
          </p>
        ) : null}

        <div className="mt-auto flex flex-col pt-2.5">
          {hasPrice ? (
            <span className="font-display text-lg font-semibold leading-none text-foreground sm:text-xl">
              {formatPrice(product.price)}
            </span>
          ) : null}
          <AddToCartButton
            productId={product.id}
            className={cn("min-h-11 w-full text-sm", hasPrice && "mt-2")}
          />
        </div>
      </div>
    </article>
  );
}
