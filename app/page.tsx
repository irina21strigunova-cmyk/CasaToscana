import { HeroSection } from "@/components/home/HeroSection";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { BrandStory } from "@/components/home/BrandStory";

export default function HomePage() {
  return (
    <div className="flex flex-col gap-14 pb-4 pt-0">
      <HeroSection />
      <CategoryGrid />
      <BrandStory />
    </div>
  );
}
