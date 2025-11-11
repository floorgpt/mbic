"use server";

import "server-only";

import type { FormsWebhookMode } from "@/types/forms";
import type { FutureSaleOpportunityDetail } from "@/types/ops";

export type WebhookTriggerResult = {
  ok: boolean;
  status?: number;
  err?: string | null;
};

export async function triggerFutureSaleStockConfirmedWebhook(
  url: string,
  mode: FormsWebhookMode,
  opportunity: FutureSaleOpportunityDetail,
): Promise<WebhookTriggerResult> {
  try {
    const webhookUrl = new URL(url);
    webhookUrl.searchParams.set("type", "future_sale_stock_confirmed");
    webhookUrl.searchParams.set("mode", mode);
    webhookUrl.searchParams.set("id", String(opportunity.id));
    webhookUrl.searchParams.set("projectName", opportunity.project_name);
    webhookUrl.searchParams.set("repId", String(opportunity.rep_id));
    webhookUrl.searchParams.set("dealerId", String(opportunity.dealer_id));
    webhookUrl.searchParams.set("expectedQty", String(opportunity.expected_qty));
    webhookUrl.searchParams.set("amount", String(opportunity.potential_amount));
    if (opportunity.ops_confirmed_at) {
      webhookUrl.searchParams.set("confirmedAt", opportunity.ops_confirmed_at);
    }

    const response = await fetch(webhookUrl.toString(), {
      method: "GET",
      headers: {
        "X-MBIC-Forms-Mode": mode,
        "X-MBIC-Event-Type": "future_sale_stock_confirmed",
      },
    });

    console.log("[ops] webhook:stock-confirmed", {
      url: webhookUrl.toString(),
      status: response.status,
      ok: response.ok,
      mode,
    });

    if (!response.ok) {
      const text = await response.text();
      return {
        ok: false,
        status: response.status,
        err: text || `Webhook responded with status ${response.status}`,
      };
    }

    return { ok: true, status: response.status };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] webhook:error", message);
    return { ok: false, status: undefined, err: message };
  }
}
