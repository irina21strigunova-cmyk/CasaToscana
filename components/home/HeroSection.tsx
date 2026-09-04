import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/Button";

export function HeroSection() {
  return (
    <section className="relative left-1/2 w-screen max-w-[100vw] -translate-x-1/2 min-h-[min(78vh,540px)] overflow-hidden">
      <Image
        src="/hero/hero-tuscany-products.jpg"
        alt="Продукты Idea Toscana на фоне тосканских холмов"
        fill
        priority
        sizes="100vw"
        className="object-cover object-[center_45%]"
      />

      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 opacity-[0.12] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
          backgroundSize: "128px 128px",
        }}
      />

      {/* Vignette + bottom fade for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-black/15 via-transparent to-black/45" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#2C2418]/75 via-[#2C2418]/25 to-transparent" />

      {/* Content */}
      <div className="relative flex min-h-[min(78vh,540px)] flex-col justify-end px-6 pb-10 pt-24">
        <p className="text-[11px] font-medium uppercase tracking-[0.35em] text-white/60">
          Idea Toscana · Firenze
        </p>

        <h2 className="font-display mt-4 text-[2.75rem] font-light leading-[1.05] tracking-wide text-white">
          Casa Toscana
        </h2>

        <p className="mt-3 max-w-[16rem] text-[15px] font-light leading-relaxed tracking-wide text-white/85">
          Из Тосканы в ваш дом
        </p>

        <Link href="/catalog" className="mt-8 inline-block w-fit">
          <Button
            variant="outline"
            size="lg"
            className="min-w-[180px] border-white/70 bg-white/10 px-10 text-white backdrop-blur-sm hover:border-white hover:bg-white/20"
          >
            Открыть бутик
          </Button>
        </Link>
      </div>
    </section>
  );
}
