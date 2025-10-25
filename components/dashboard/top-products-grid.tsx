"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import type { OrgProduct } from "@/lib/mbic-dashboard";
import { formatCurrency, formatPercentWhole } from "@/lib/utils/format";

type TopProductsGridProps = {
  products: OrgProduct[];
  pageSize?: number;
};

export function TopProductsGrid({ products, pageSize = 6 }: TopProductsGridProps) {
  const [page, setPage] = useState(0);
  const totalPages = Math.max(1, Math.ceil(products.length / pageSize));

  const visible = useMemo(() => {
    const start = page * pageSize;
    return {
      start,
      items: products.slice(start, start + pageSize),
    };
  }, [page, pageSize, products]);

  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-muted bg-muted/30 p-8 text-center text-sm text-muted-foreground">
        Data available soon.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {visible.items.map((product, idx) => {
          const rank = visible.start + idx + 1;
          return (
            <div
              key={product.category_key}
              className="flex items-center gap-4 rounded-2xl border bg-background/80 p-4 shadow-sm ring-1 ring-muted"
            >
              <div className="text-xs font-semibold text-muted-foreground">#{rank}</div>
              <div className="h-12 w-12 overflow-hidden rounded-xl bg-muted/70">
                {product.icon_url ? (
                  <Image
                    src={product.icon_url}
                    alt={product.display_name}
                    width={64}
                    height={64}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm font-semibold text-muted-foreground">
                    {product.display_name.slice(0, 2).toUpperCase()}
                  </div>
                )}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold">{product.display_name}</span>
                <span className="text-xs text-muted-foreground">
                  {formatCurrency(product.total_sales)} • {formatPercentWhole(product.share_pct)}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {products.length > pageSize && (
        <div className="flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.max(0, current - 1))}
            disabled={page === 0}
          >
            Previous
          </Button>
          <span className="text-xs text-muted-foreground">
            Page {page + 1} of {totalPages}
          </span>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setPage((current) => Math.min(totalPages - 1, current + 1))}
            disabled={page >= totalPages - 1}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
