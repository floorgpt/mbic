"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type RangePresetId = "ytd" | "qtd" | "mtd" | "custom";

export type RangePreset = {
  id: RangePresetId;
  label: string;
  from: string;
  to: string;
  description?: string;
};

type RangePickerProps = {
  presets: RangePreset[];
  activePreset: RangePresetId;
  from: string;
  to: string;
  className?: string;
};

function buildHref(
  pathname: string,
  searchParamsString: string,
  nextFrom: string,
  nextTo: string,
  preset: RangePresetId,
) {
  const params = new URLSearchParams(searchParamsString);
  params.set("from", nextFrom);
  params.set("to", nextTo);
  params.set("range", preset);
  return `${pathname}?${params.toString()}`;
}

export function SalesOpsRangePicker({
  presets,
  activePreset,
  from,
  to,
  className,
}: RangePickerProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const searchParamsString = React.useMemo(
    () => searchParams?.toString() ?? "",
    [searchParams],
  );
  const [customFrom, setCustomFrom] = React.useState(from);
  const [customTo, setCustomTo] = React.useState(to);
  const [showCustom, setShowCustom] = React.useState(activePreset === "custom");
  const [isPending, startTransition] = React.useTransition();

  React.useEffect(() => {
    if (activePreset !== "custom") {
      const preset = presets.find((item) => item.id === activePreset);
      if (preset) {
        setCustomFrom(preset.from);
        setCustomTo(preset.to);
      }
      setShowCustom(false);
    } else {
      setShowCustom(true);
      setCustomFrom(from);
      setCustomTo(to);
    }
  }, [activePreset, from, to, presets]);

  const applyRange = React.useCallback(
    (nextFrom: string, nextTo: string, presetId: RangePresetId) => {
      if (!nextFrom || !nextTo) return;
      const href = buildHref(pathname, searchParamsString, nextFrom, nextTo, presetId);
      startTransition(() => {
        router.push(href);
      });
    },
    [pathname, router, searchParamsString],
  );

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        {presets.map((preset) => {
          const isActive = preset.id === activePreset;
          return (
            <Button
              key={preset.id}
              type="button"
              size="sm"
              variant={isActive ? "default" : "outline"}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide transition",
                isActive && "shadow-sm",
              )}
              onClick={() => {
                if (preset.id === "custom") {
                  setShowCustom((prev) => !prev);
                  return;
                }
                applyRange(preset.from, preset.to, preset.id);
              }}
              disabled={isPending && preset.id !== activePreset}
            >
              {preset.label}
            </Button>
          );
        })}
      </div>

      {showCustom ? (
        <form
          className="flex flex-col gap-2 rounded-xl border border-dashed border-muted bg-muted/50 p-3 sm:flex-row sm:items-center"
          onSubmit={(event) => {
            event.preventDefault();
            applyRange(customFrom, customTo, "custom");
          }}
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              From
            </label>
            <Input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="rounded-lg bg-background text-sm"
              max={customTo || undefined}
              required
            />
          </div>
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              To
            </label>
            <Input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="rounded-lg bg-background text-sm"
              min={customFrom || undefined}
              required
            />
          </div>
          <div className="flex items-end">
            <Button
              type="submit"
              size="sm"
              className="rounded-lg px-3 py-2 text-xs font-semibold uppercase tracking-wide"
              disabled={!customFrom || !customTo || isPending}
            >
              {isPending ? "Applying…" : "Apply"}
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}
