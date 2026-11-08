import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCartButton } from "@/components/product/AddToCartButton";
import detailsData from "@/data/product-details.json";
import { formatPrice, getProductBySlug, getProducts } from "@/lib/products";

interface ProductDetails {
  description?: string;
  ingredients?: string;
  compositionLabel?: string;
  characteristics?: Record<string, string>;
}

const details = detailsData as Record<string, ProductDetails>;
type Props = { params: Promise<{ slug: string }> };

export const dynamicParams = false;

export function generateStaticParams() {
  return getProducts().map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = getProductBySlug((await params).slug);
  return product ? { title: `${product.name} | Casa Toscana` } : {};
}

export default async function ProductPage({ params }: Props) {
  const product = getProductBySlug((await params).slug);
  if (!product) notFound();

  const extra = details[product.id];
  const characteristics: Record<string, string> = {
    Бренд: "Idea Toscana",
    Категория: product.category,
    ...(product.volume ? { "Объём / формат": product.volume } : {}),
    ...extra?.characteristics,
  };
  const title = product.volume ? `${product.name} ${product.volume}` : product.name;

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6">
      <Link
        href={`/catalog?category=${product.categorySlug}`}
        className="mb-5 inline-flex min-h-11 items-center text-sm font-medium text-olive underline underline-offset-4"
      >
        Назад в раздел «{product.category}»
      </Link>
      <div className="grid items-start gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        {product.image && (
          <img
            src={encodeURI(product.image)}
            alt={title}
            width={700}
            height={1050}
            className="aspect-[2/3] w-full max-w-sm rounded-3xl object-cover"
          />
        )}
        <div className="min-w-0">
          <h1 className="font-display text-3xl font-semibold leading-tight text-foreground">{title}</h1>
          <p className="my-4 font-display text-2xl font-semibold">{formatPrice(product.price)}</p>
          {product.price !== null && (
            <AddToCartButton productId={product.id} className="mb-5 min-h-11 w-full sm:w-auto" />
          )}
          <div className="divide-y divide-foreground/10 rounded-2xl bg-cream px-4">
            <details open className="py-3">
              <summary className="cursor-pointer py-2 font-semibold">Описание</summary>
              <p className="whitespace-pre-line pb-2 text-sm leading-relaxed">{extra?.description || product.description}</p>
            </details>
            <details className="py-3">
              <summary className="cursor-pointer py-2 font-semibold">Состав</summary>
              <p className="whitespace-pre-line break-words pb-2 text-sm leading-relaxed">
                {extra?.ingredients
                  ? [extra.compositionLabel, extra.ingredients].filter(Boolean).join("\n")
                  : extra?.compositionLabel || "Состав уточняется."}
              </p>
            </details>
            <details className="py-3">
              <summary className="cursor-pointer py-2 font-semibold">Характеристики</summary>
              <dl className="space-y-2 pb-2 text-sm">
                {Object.entries(characteristics).map(([label, value]) => (
                  <div key={label} className="grid grid-cols-2 gap-2">
                    <dt className="text-muted">{label}</dt>
                    <dd className="break-words">{value}</dd>
                  </div>
                ))}
              </dl>
            </details>
            <details className="py-3">
              <summary className="cursor-pointer py-2 font-semibold">Информация о доставке</summary>
              <p className="pb-2 text-sm leading-relaxed">
                По России отправляем заказы СДЭК до пункта выдачи или курьером.
                По Москве и Ставрополю также доступна Яндекс Доставка.
                Стоимость и сроки зависят от города и способа получения.
              </p>
              <Link href="/payment-delivery-return" className="inline-block pb-2 text-sm text-olive underline underline-offset-4">
                Условия оплаты, доставки и возврата
              </Link>
            </details>
          </div>
        </div>
      </div>
    </div>
  );
}
