import Image from "next/image";
import Link from "next/link";

import type { CategoryRow } from "@/lib/mbic-supabase";
import { fmtPct0, fmtUSD0, fmtCompact } from "@/lib/format";

const FALLBACK_ICON =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='128' height='128' viewBox='0 0 128 128'%3E%3Crect width='128' height='128' rx='24' fill='%23F4F4F5'/%3E%3Cpath d='M40 78l16-20 18 14 14-18' stroke='%239999A1' stroke-width='6' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E";

type TopProductsGridProps = {
  products: CategoryRow[];
  currentPage: number;
  pageSize?: number;
  buildPageHref: (page: number) => string;
};

export function TopProductsGrid({ products, currentPage, pageSize = 6, buildPageHref }: TopProductsGridProps) {
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
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.map((product, index) => {
          const rank = start + index + 1;
          return (
            <div
              key={`${product.category_key}-${rank}`}
              className="flex items-center gap-4 rounded-2xl border bg-background/80 p-4 shadow-sm ring-1 ring-muted"
            >
              <div className="text-xs font-semibold text-muted-foreground">#{rank}</div>
              <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted/60">
                <Image
                  src={product.icon_url ?? FALLBACK_ICON}
                  alt={product.display_name}
                  width={64}
                  height={64}
                  className="size-full object-contain"
                  unoptimized
                  onError={(event) => {
                    event.currentTarget.src = FALLBACK_ICON;
                  }}
                />
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">{product.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  <span className="hidden md:inline">{fmtUSD0(product.total_sales)}</span>
                  <span className="md:hidden">{fmtCompact(product.total_sales)}</span>
                  {" • "}
                  {fmtPct0(product.share_pct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <Link
            href={buildPageHref(Math.max(1, safePage - 1))}
            className="rounded-full border px-3 py-1 hover:bg-muted"
            aria-disabled={safePage === 1}
            data-disabled={safePage === 1}
          >
            Previous
          </Link>
          <span>
            Page {safePage} / {totalPages}
          </span>
          <Link
            href={buildPageHref(Math.min(totalPages, safePage + 1))}
            className="rounded-full border px-3 py-1 hover:bg-muted"
            aria-disabled={safePage >= totalPages}
            data-disabled={safePage >= totalPages}
          >
            Next
          </Link>
        </div>
      )}
    </div>
  );
}
