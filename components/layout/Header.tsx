import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-milk-dark/40 bg-milk/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-md items-center justify-center px-5 py-3.5">
        <Link href="/" className="text-center">
          <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-olive/70">
            Idea Toscana
          </p>
          <h1 className="font-display text-xl font-light tracking-[0.08em] text-foreground">
            Casa Toscana
          </h1>
        </Link>
      </div>
    </header>
  );
}
