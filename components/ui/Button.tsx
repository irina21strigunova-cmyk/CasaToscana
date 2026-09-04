import { cn } from "@/lib/utils";
import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "outline";
  size?: "sm" | "md" | "lg";
}

const variants = {
  primary:
    "bg-terracotta text-white hover:bg-terracotta-dark active:scale-[0.98]",
  secondary:
    "bg-olive text-white hover:bg-olive-light active:scale-[0.98]",
  ghost:
    "bg-transparent text-olive hover:bg-milk-dark active:scale-[0.98]",
  outline:
    "border border-foreground/20 bg-transparent text-foreground hover:bg-milk-dark active:scale-[0.98]",
};

const sizes = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-base",
  lg: "px-8 py-4 text-base",
};

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-2xl border border-transparent font-medium transition-all duration-200 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
