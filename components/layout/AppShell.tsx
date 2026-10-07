"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { SiteFooter } from "./SiteFooter";
import { legalPaths } from "@/data/seller";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCatalog = pathname.startsWith("/catalog");
  const isLegal = legalPaths.some((path) => pathname === path);

  return (
    <div
      className={cn(
        "mx-auto min-h-screen bg-milk",
        isCatalog || isLegal
          ? "max-w-md md:max-w-3xl lg:max-w-6xl"
          : "max-w-md"
      )}
    >
      <Header />
      <main className="pb-8">{children}</main>
      <SiteFooter />
      <div className="h-24" aria-hidden />
      <BottomNav />
    </div>
  );
}
