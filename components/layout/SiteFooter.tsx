import Link from "next/link";
import { legalNav, seller } from "@/data/seller";

export function SiteFooter() {
  return (
    <footer className="border-t border-milk-dark/70 px-5 pb-6 pt-10">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
          Покупателям
        </p>
        <ul className="mt-4 flex flex-col gap-2.5">
          {legalNav.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className="text-sm leading-relaxed text-foreground/80 underline decoration-foreground/15 underline-offset-4 hover:text-olive"
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-[12px] leading-relaxed text-muted">
          {seller.brand} · {seller.shortName}
          <br />
          <a
            href={`mailto:${seller.email}`}
            className="underline decoration-foreground/15 underline-offset-4 hover:text-olive"
          >
            {seller.email}
          </a>
        </p>
      </div>
    </footer>
  );
}
