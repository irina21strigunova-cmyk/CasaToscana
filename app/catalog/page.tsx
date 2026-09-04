import { Suspense } from "react";
import { CatalogContent } from "./CatalogContent";

export default function CatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="px-4 py-6">
          <div className="h-8 w-32 animate-pulse rounded-lg bg-cream" />
          <div className="mt-6 grid gap-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-64 animate-pulse rounded-2xl bg-cream"
              />
            ))}
          </div>
        </div>
      }
    >
      <CatalogContent />
    </Suspense>
  );
}
