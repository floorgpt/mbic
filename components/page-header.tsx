import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  description?: string;
  kicker?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  title,
  description,
  kicker,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "sticky top-24 z-10 mb-6 border-b border-border/60 bg-background/95 pb-4 supports-[backdrop-filter]:backdrop-blur md:pb-5",
        "backdrop-blur",
        className,
      )}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col gap-1">
          {kicker ? (
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {kicker}
            </p>
          ) : null}
          <h1 className="font-montserrat text-3xl font-semibold">{title}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
            {actions}
          </div>
        ) : null}
      </div>
    </div>
  );
}
