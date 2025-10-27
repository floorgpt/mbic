import type { ReactNode } from "react";

import { type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type KpiCardProps = {
  title: string;
  value: string;
  delta?: {
    value: string;
    trend: "up" | "down" | "neutral";
    description?: string;
  };
  icon?: LucideIcon;
  className?: string;
  statusBadge?: ReactNode;
};

export function KpiCard({
  title,
  value,
  delta,
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
        <div className="font-montserrat text-2xl font-semibold tabular-nums md:text-3xl">
          {value}
        </div>
        {delta ? (
          <p
            className={cn(
              "text-xs text-muted-foreground",
              delta.trend === "up" && "text-emerald-500",
              delta.trend === "down" && "text-rose-500",
            )}
          >
            {delta.value}
            {delta.description ? ` • ${delta.description}` : null}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
