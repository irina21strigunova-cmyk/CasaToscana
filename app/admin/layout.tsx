import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  title: "Заказы · Casa Toscana",
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
