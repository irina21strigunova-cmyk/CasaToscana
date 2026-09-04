"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { cn } from "@/lib/utils";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isCatalog = pathname.startsWith("/catalog");

  return (
    <div
      className={cn(
        "mx-auto min-h-screen bg-milk",
        isCatalog ? "max-w-md md:max-w-3xl lg:max-w-6xl" : "max-w-md"
      )}
    >
      <Header />
      <main className="pb-24">{children}</main>
      <BottomNav />
    </div>
  );
}
