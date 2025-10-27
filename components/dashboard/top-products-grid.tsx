import Image from "next/image";
import Link from "next/link";

import type { CategoryRow } from "@/lib/mbic-supabase";
import { fmtPct0, fmtUSD0 } from "@/lib/format";
import { getIcon } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type TopProductsGridProps = {
  products: CategoryRow[];
  currentPage: number;
  pageSize?: number;
  buildPageHref: (page: number) => string;
};

export function TopProductsGrid({
  products,
  currentPage,
  pageSize = 6,
  buildPageHref,
}: TopProductsGridProps) {
  if (!products.length) {
    return (
      <div className="rounded-2xl border border-dashed border-muted bg-muted/40 p-8 text-center text-sm text-muted-foreground">
        No data for this period.
      </div>
    );
  }

  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));
  const safePage = Math.min(Math.max(currentPage, 1), totalPages);
  const start = (safePage - 1) * pageSize;
  const visible = products.slice(start, start + pageSize);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        {visible.map((product, index) => {
          const rank = start + index + 1;
          return (
            <div
              key={`${product.category_key}-${rank}`}
              className="flex items-center gap-3 rounded-2xl border border-black/5 bg-card p-4 shadow-sm"
            >
              <Badge
                variant="secondary"
                className="rounded-full px-2 text-[10px] font-semibold uppercase tracking-wide"
              >
                #{rank}
              </Badge>
              <div className="shrink-0">
                <Image
                  src={getIcon(product.icon_url ?? undefined)}
                  alt={product.display_name}
                  width={40}
                  height={40}
                  sizes="(max-width: 640px) 40px, (max-width: 1024px) 40px, 40px"
                  className="h-10 w-10 rounded-lg ring-1 ring-black/5"
                />
              </div>
              <div className="flex flex-1 items-center justify-between gap-2">
                <div className="text-sm">
                  <p className="font-semibold tracking-tight">{product.display_name}</p>
                  <p className="text-xs text-muted-foreground">Category</p>
                </div>
                <div className="text-right text-sm font-semibold tabular-nums">
                  <p>{fmtUSD0(product.total_sales)}</p>
                  <p className="text-xs font-normal text-muted-foreground">{fmtPct0(product.share_pct)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 ? (
        <div className="flex justify-end gap-2 text-xs text-muted-foreground">
          <Link
            href={buildPageHref(Math.max(1, safePage - 1))}
            className="rounded-full border border-black/10 px-3 py-1 transition hover:bg-muted"
            aria-disabled={safePage === 1}
            data-disabled={safePage === 1}
          >
            Previous
          </Link>
          <span className="self-center">
            Page {safePage} / {totalPages}
          </span>
          <Link
            href={buildPageHref(Math.min(totalPages, safePage + 1))}
            className="rounded-full border border-black/10 px-3 py-1 transition hover:bg-muted"
            aria-disabled={safePage >= totalPages}
            data-disabled={safePage >= totalPages}
          >
            Next
          </Link>
        </div>
      ) : null}
    </div>
  );
}
