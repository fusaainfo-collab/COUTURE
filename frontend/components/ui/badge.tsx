import { cn } from "@/lib/utils";

export function Badge({
  children,
  tone = "neutral"
}: {
  children: React.ReactNode;
  tone?: "neutral" | "gold" | "red" | "green";
}) {
  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1 rounded-lg border px-2.5 text-xs font-medium",
        tone === "neutral" && "border-line bg-ivory/6 text-stone-300",
        tone === "gold" && "border-gold/35 bg-gold/12 text-gold",
        tone === "red" && "border-red-400/35 bg-red-500/12 text-red-200",
        tone === "green" && "border-emerald-400/35 bg-emerald-500/12 text-emerald-200"
      )}
    >
      {children}
    </span>
  );
}
