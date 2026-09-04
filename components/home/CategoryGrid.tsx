import type { ReactNode } from "react";
import { boutiqueCategories } from "@/data/categories";
import { CategoryCard } from "./CategoryCard";

function renderRows() {
  const rows: ReactNode[] = [];
  let i = 0;

  while (i < boutiqueCategories.length) {
    const current = boutiqueCategories[i];

    if (
      current.layout === "tall" &&
      i + 1 < boutiqueCategories.length &&
      boutiqueCategories[i + 1].layout === "tall"
    ) {
      const next = boutiqueCategories[i + 1];
      rows.push(
        <div key={`${current.slug}-${next.slug}`} className="grid grid-cols-2 gap-4">
          <CategoryCard category={current} />
          <CategoryCard category={next} />
        </div>
      );
      i += 2;
      continue;
    }

    rows.push(<CategoryCard key={current.slug} category={current} />);
    i += 1;
  }

  return rows;
}

export function CategoryGrid() {
  return (
    <section className="px-5">
      <header className="mb-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
          Коллекции
        </p>
        <h2 className="font-display mt-2 text-[2rem] font-light leading-[1.08] text-foreground">
          Исследуйте
          <br />
          бутик
        </h2>
        <p className="mt-2.5 max-w-[18rem] text-[14px] font-light leading-snug text-muted">
          Коллекции итальянского образа жизни — свет, текстура и аромат Тосканы.
        </p>
      </header>

      <div className="flex flex-col gap-5">{renderRows()}</div>
    </section>
  );
}
