import type { ReactNode } from "react";

export function LegalDocument({
  title,
  children,
  updatedAt,
}: {
  title: string;
  children: ReactNode;
  updatedAt?: string;
}) {
  return (
    <article className="px-4 py-8 md:px-8">
      <div className="mx-auto max-w-4xl">
        <p className="text-[11px] font-medium uppercase tracking-[0.28em] text-olive/75">
          Покупателям
        </p>
        <h1 className="font-display mt-3 text-3xl font-semibold leading-tight text-foreground md:text-4xl">
          {title}
        </h1>
        {updatedAt ? (
          <p className="mt-3 text-sm text-muted">Редакция от {updatedAt}</p>
        ) : null}
        <div className="mt-8 flex flex-col gap-9 text-[15px] font-light leading-[1.8] text-foreground/90">
          {children}
        </div>
      </div>
    </article>
  );
}

export function LegalSection({
  id,
  title,
  children,
}: {
  id?: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24">
      <h2 className="font-display text-xl font-semibold leading-snug text-foreground md:text-2xl">
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3">{children}</div>
    </section>
  );
}

export function LegalSubheading({ children }: { children: ReactNode }) {
  return (
    <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
      {children}
    </h3>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {items.map((item, index) => (
        <li key={index}>{item}</li>
      ))}
    </ul>
  );
}
