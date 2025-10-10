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
};

export function KpiCard({
  title,
  value,
  delta,
  icon: Icon,
  className,
}: KpiCardProps) {
  return (
    <Card className={cn("border-none bg-gradient-to-br from-background to-muted", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </CardHeader>
      <CardContent>
        <div className="font-montserrat text-2xl font-semibold tracking-tight">
          {value}
        </div>
        {delta ? (
          <p
            className={cn(
              "mt-2 text-xs font-medium",
              delta.trend === "up" && "text-emerald-500",
              delta.trend === "down" && "text-rose-500",
              delta.trend === "neutral" && "text-muted-foreground",
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
