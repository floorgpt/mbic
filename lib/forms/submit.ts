"use client";

import type { FutureSalePayload, LossOpportunityPayload } from "@/types/forms";

type FormsApiResponse = {
  ok: boolean;
  data?: unknown;
  err?: string | null;
  meta?: unknown;
  id?: number | null;
};

type LossOpportunityApiResponse = FormsApiResponse;
type FutureSaleApiResponse = FormsApiResponse;

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

export async function createFutureSale(
  payload: FutureSalePayload,
): Promise<FutureSaleApiResponse> {
  const response = await fetch("/api/forms/future-sale", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  let json: FutureSaleApiResponse | null = null;
  try {
    json = (await response.json()) as FutureSaleApiResponse;
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
