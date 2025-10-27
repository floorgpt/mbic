import type { ReactNode } from "react";

import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Tone = "neutral" | "up" | "down";

type KpiCardProps = {
  title: string;
  value: string;
  subtitle?: string;
  helper?: string;
  tone?: Tone;
  icon?: LucideIcon;
  className?: string;
  statusBadge?: ReactNode;
};

export function KpiCard({
  title,
  value,
  subtitle,
  helper,
  tone = "neutral",
  icon: Icon,
  className,
  statusBadge,
}: KpiCardProps) {
  return (
    <Card
      className={cn(
        "rounded-2xl border border-black/5 bg-card shadow-sm transition-colors",
        className,
      )}
    >
      <CardHeader className="flex flex-row items-start justify-between space-y-0 p-4 sm:p-6 pb-0">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="flex items-center gap-2">
          {statusBadge}
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-muted-foreground/20 text-muted-foreground/70">
            {Icon ? <Icon className="size-3" /> : null}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 p-4 pt-3 sm:p-6">
        <div className="font-montserrat text-3xl font-semibold tabular-nums md:text-4xl">
          {value}
        </div>
        {subtitle ? (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              tone === "up" && "text-emerald-500",
              tone === "down" && "text-rose-500",
            )}
          >
            {subtitle}
          </p>
        ) : null}
        {helper ? <p className="text-[11px] uppercase tracking-wide text-muted-foreground/80">{helper}</p> : null}
      </CardContent>
    </Card>
  );
}
