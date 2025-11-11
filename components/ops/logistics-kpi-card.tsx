import { Card, CardContent } from "@/components/ui/card";
import { TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

type LogisticsKPICardProps = {
  title: string;
  value: string | number;
  changePct: number;
  changeLabel?: string;
  suffix?: string;
  description?: string;
  variant?: "default" | "currency" | "percentage" | "decimal" | "days";
};

export function LogisticsKPICard({
  title,
  value,
  changePct,
  changeLabel = "From Previous Year",
  suffix = "",
  description,
  variant = "default",
}: LogisticsKPICardProps) {
  const isPositive = changePct >= 0;
  const isNeutral = changePct === 0;

  // Format value based on variant
  const formattedValue = typeof value === "number" && variant === "currency"
    ? new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value)
    : typeof value === "number" && variant === "percentage"
      ? `${value.toFixed(1)}%`
      : typeof value === "number" && variant === "decimal"
        ? value.toFixed(1)
        : typeof value === "number" && variant === "days"
          ? `${value} Days`
          : value;

  return (
    <Card className="border-muted/50 hover:border-muted/80 transition-colors">
      <CardContent className="p-6">
        <div className="space-y-3">
          {/* Title */}
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {title}
          </p>

          {/* Value */}
          <div className="flex items-baseline gap-2">
            <p className="font-montserrat text-3xl font-bold text-foreground">
              {formattedValue}
              {suffix && <span className="text-2xl">{suffix}</span>}
            </p>
          </div>

          {/* Change Indicator */}
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold",
                isNeutral && "bg-muted/50 text-muted-foreground",
                isPositive && !isNeutral && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400",
                !isPositive && !isNeutral && "bg-red-100 text-red-700 dark:bg-red-950/50 dark:text-red-400",
              )}
            >
              {!isNeutral && (
                <>
                  {isPositive ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                </>
              )}
              <span>
                {isPositive && !isNeutral ? "+" : ""}
                {changePct.toFixed(1)}%
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{changeLabel}</p>
          </div>

          {/* Description */}
          {description && (
            <p className="text-xs text-muted-foreground/80 leading-relaxed">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
