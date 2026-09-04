import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Source_Sans_3 } from "next/font/google";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600", "700"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin", "cyrillic"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  title: "Casa Toscana — Итальянская косметика",
  description:
    "Премиальная косметика Idea Toscana. Натуральный уход, вдохновлённый Тосканой.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#faf7f2",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      <body
        className={`${cormorant.variable} ${sourceSans.variable} bg-milk text-foreground antialiased`}
      >
        <AppShell>{children}</AppShell>
      </body>
    </html>
  );
}
