"use client";

import type { CollectionDealerRow } from "@/types/salesops";
import type { PanelMeta } from "@/lib/utils";

export type CollectionDealerResponse = {
  ok: boolean;
  data: CollectionDealerRow[];
  meta: PanelMeta;
  collection: string;
  from: string;
  to: string;
  error?: string;
};

export async function fetchCollectionDealers(
  collection: string,
  from: string,
  to: string,
  signal?: AbortSignal,
): Promise<CollectionDealerResponse> {
  const params = new URLSearchParams({
    name: collection,
    from,
    to,
  });
  const response = await fetch(`/api/collection-by-dealer?${params.toString()}`, {
    method: "GET",
    signal,
    headers: {
      "Content-Type": "application/json",
    },
  });

  const payload = (await response.json()) as CollectionDealerResponse;

  if (!response.ok) {
    return {
      ok: false,
      data: [],
      meta: {
        ok: false,
        count: 0,
        err: payload?.error ?? `Failed to load dealers for ${collection}`,
      },
      collection,
      from,
      to,
      error: payload?.error ?? response.statusText,
    };
  }

  return payload;
}
