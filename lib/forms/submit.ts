"use client";

import type { LossOpportunityPayload } from "@/types/forms";

type LossOpportunityApiResponse = {
  ok: boolean;
  data?: unknown;
  err?: string | null;
  meta?: unknown;
};

export async function createLossOpportunity(
  payload: LossOpportunityPayload,
): Promise<LossOpportunityApiResponse> {
  const response = await fetch("/api/forms/loss-opportunity", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let json: LossOpportunityApiResponse | null = null;
  try {
    json = (await response.json()) as LossOpportunityApiResponse;
  } catch (error) {
    console.error("[forms] submit:invalid-json", error);
    json = { ok: false, err: "Invalid server response" };
  }

  if (!response.ok) {
    return {
      ok: false,
      err: json?.err ?? response.statusText,
      data: null,
      meta: json?.meta,
    };
  }

  return json ?? { ok: false, err: "Unknown server response" };
}
