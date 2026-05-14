import { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
};

export function Button({ className, variant = "primary", ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium transition focus:outline-none focus:ring-2 focus:ring-gold/40 disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-gold text-ink hover:bg-[#e2c16d]",
        variant === "secondary" && "border border-line bg-ivory/8 text-ivory hover:bg-ivory/12",
        variant === "ghost" && "text-stone-300 hover:bg-ivory/8 hover:text-ivory",
        className
      )}
      {...props}
    />
  );
}

