import Image from "next/image";
import Link from "next/link";
import type { BoutiqueCategory } from "@/data/categories";
import { cn } from "@/lib/utils";

interface CategoryCardProps {
  category: BoutiqueCategory;
  className?: string;
}

const layoutStyles = {
  hero: "aspect-[4/5] min-h-[22rem]",
  tall: "aspect-[3/4] min-h-[17rem]",
  wide: "aspect-[16/10] min-h-[13rem]",
};

export function CategoryCard({ category, className }: CategoryCardProps) {
  const isTall = category.layout === "tall";

  return (
    <Link
      href={`/catalog?category=${category.slug}`}
      className={cn(
        "group relative block overflow-hidden rounded-[24px]",
        layoutStyles[category.layout],
        className
      )}
    >
      <Image
        src={encodeURI(category.image)}
        alt={category.name}
        fill
        sizes={
          isTall
            ? "(max-width: 448px) 45vw, 200px"
            : "(max-width: 448px) 100vw, 448px"
        }
        className="object-cover transition-transform duration-[900ms] ease-out group-hover:scale-[1.05]"
        style={{ objectPosition: category.imagePosition }}
      />

      <div
        className="absolute inset-0 mix-blend-multiply opacity-65 transition-opacity duration-500 group-hover:opacity-50"
        style={{ backgroundColor: category.overlay }}
      />

      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(to top, rgba(28, 22, 16, 0.62) 0%, rgba(28, 22, 16, 0.28) 32%, rgba(28, 22, 16, 0.06) 55%, transparent 70%)",
        }}
      />

      <div className="absolute left-4 top-4 sm:left-5 sm:top-5">
        <p className="text-[10px] font-medium uppercase tracking-[0.32em] text-white/35">
          {category.collection}
        </p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col justify-end px-4 pb-4 pt-12 sm:px-5 sm:pb-5">
        <h3 className="font-display line-clamp-2 max-w-full pe-[0.2em] text-[1.3rem] font-light leading-[1.08] text-white sm:text-[1.4rem]">
          {category.name}
        </h3>

        <div className="mt-2 inline-flex w-fit items-center gap-1.5 border-b border-white/20 pb-0.5 transition-[border-color,gap] duration-400 group-hover:gap-2 group-hover:border-white/45">
          <span className="text-[11px] font-light tracking-[0.06em] text-white/80 transition-colors duration-300 group-hover:text-white">
            Смотреть коллекцию
          </span>
          <span
            aria-hidden
            className="translate-y-px text-[12px] font-light text-white/65 transition-transform duration-400 group-hover:translate-x-0.5 group-hover:text-white"
          >
            →
          </span>
        </div>
      </div>
    </Link>
  );
}
