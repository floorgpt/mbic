import type { Metadata } from "next";

import { FormsPageClient } from "@/components/forms/forms-page-client";
import { getCategories, getSalesReps } from "@/lib/forms/catalog";
import { runFormsDiagnostics } from "@/lib/forms/diag";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  title: "Sales Ops Forms",
  description: "Registra oportunidades perdidas y notifica a Sales Ops en tiempo real.",
};

export default async function FormsPage() {
  const [salesReps, categories, diag] = await Promise.all([
    getSalesReps(),
    getCategories(),
    runFormsDiagnostics({ dryRun: true }),
  ]);

  const diagChecks = diag.checks.map((check) => ({
    label: check.label,
    ok: check.ok,
    status: check.status,
    count: check.count,
    err: check.err ?? null,
  }));

  return (
    <FormsPageClient
      initialSalesReps={salesReps.data ?? []}
      initialCategories={categories.data ?? []}
      diagChecks={diagChecks}
    />
  );
}
