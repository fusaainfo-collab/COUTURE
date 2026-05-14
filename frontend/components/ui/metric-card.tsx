import { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function MetricCard({
  label,
  value,
  detail,
  icon: Icon,
  accent = false
}: {
  label: string;
  value: string | number;
  detail: string;
  icon: LucideIcon;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-lg border bg-ivory/[0.055] p-4 shadow-premium",
        accent ? "border-gold/40" : "border-line"
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-stone-400">{label}</p>
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-line bg-ink/60 text-gold">
          <Icon size={18} />
        </span>
      </div>
      <div className="mt-4 text-2xl font-semibold text-ivory">{value}</div>
      <p className="mt-1 text-sm text-stone-500">{detail}</p>
    </div>
  );
}

