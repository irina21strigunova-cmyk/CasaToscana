import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { FeaturedProducts } from "@/components/home/FeaturedProducts";
import { BrandStory } from "@/components/home/BrandStory";
import { getFeaturedProducts } from "@/lib/products";

export default function HomePage() {
  const featured = getFeaturedProducts();

  return (
    <div className="flex flex-col gap-14 pb-4 pt-0">
      <HeroSection />
      <CategoryGrid />
      <FeaturedProducts products={featured} />
      <BrandStory />
    </div>
  );
}
