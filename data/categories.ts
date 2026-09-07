export interface CatalogCategory {
  slug: string;
  name: string;
}

/** Single source of truth for catalog filters and homepage collections. */
export const catalogCategories: CatalogCategory[] = [
  { slug: "body", name: "Уход за телом" },
  { slug: "face", name: "Уход за лицом" },
  { slug: "prima-fioritura", name: "Линия Prima Fioritura" },
  { slug: "bio-le-veneri", name: "Линия Bio Le Veneri" },
  { slug: "home", name: "Косметика для дома" },
  { slug: "car-fragrance", name: "Аромадиффузоры для авто" },
  { slug: "scented-paper", name: "Парфюмированная бумага" },
  { slug: "gift-sets", name: "Подарочный набор" },
];

export interface BoutiqueCategory {
  slug: string;
  name: string;
  subtitle: string;
  collection: string;
  /** Local image in /public/categories/ */
  image: string;
  imagePosition: string;
  overlay: string;
  layout: "hero" | "tall" | "wide";
  /** Raise text over landscape so it does not cover the product in the photo */
  textPlacement?: "default" | "raised";
}

/**
 * Homepage collection cards — same categories as catalogCategories.
 * Short unified subtitles matched to each category image.
 */
export const boutiqueCategories: BoutiqueCategory[] = [
  {
    slug: "body",
    name: "Уход за телом",
    subtitle: "Масла оливы и нежный ежедневный уход",
    collection: "01",
    image: "/categories/Уход за телом.jpg",
    imagePosition: "center 40%",
    overlay: "rgba(168, 149, 120, 0.16)",
    layout: "hero",
  },
  {
    slug: "face",
    name: "Уход за лицом",
    subtitle: "Увлажнение и сияние кожи",
    collection: "02",
    image: "/categories/Уход за лицом.jpg",
    imagePosition: "center 62%",
    overlay: "rgba(180, 160, 140, 0.12)",
    layout: "tall",
    textPlacement: "raised",
  },
  {
    slug: "prima-fioritura",
    name: "Линия Prima Fioritura",
    subtitle: "Цветочная нежность Тосканы",
    collection: "03",
    image: "/categories/Линия Prima Fioritura.jpg",
    imagePosition: "center 58%",
    overlay: "rgba(154, 136, 120, 0.16)",
    layout: "tall",
    textPlacement: "raised",
  },
  {
    slug: "bio-le-veneri",
    name: "Линия Bio Le Veneri",
    subtitle: "Органика на виноградном соке",
    collection: "04",
    image: "/categories/Линия Bio Le Veneri.jpg",
    imagePosition: "center 65%",
    overlay: "rgba(120, 140, 100, 0.14)",
    layout: "wide",
    textPlacement: "raised",
  },
  {
    slug: "home",
    name: "Косметика для дома",
    subtitle: "Аромат и уют итальянского дома",
    collection: "05",
    image: "/categories/Косметика для дома.jpg",
    imagePosition: "center center",
    overlay: "rgba(154, 136, 120, 0.16)",
    layout: "hero",
  },
  {
    slug: "car-fragrance",
    name: "Аромадиффузоры для авто",
    subtitle: "Премиальный аромат для салона",
    collection: "06",
    image: "/categories/111.jpg",
    imagePosition: "center 52%",
    overlay: "rgba(80, 65, 55, 0.22)",
    layout: "tall",
  },
  {
    slug: "scented-paper",
    name: "Парфюмированная бумага",
    subtitle: "Тонкий аромат для пространства",
    collection: "07",
    image: "/categories/Парфюмированная бумага.jpg",
    imagePosition: "center 40%",
    overlay: "rgba(170, 140, 120, 0.12)",
    layout: "wide",
  },
  {
    slug: "gift-sets",
    name: "Подарочный набор",
    subtitle: "Готовые комплекты в подарок",
    collection: "08",
    image: "/categories/Подарочный набор.jpg",
    imagePosition: "center 42%",
    overlay: "rgba(180, 150, 120, 0.12)",
    layout: "tall",
  },
];
