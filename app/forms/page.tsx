import type { Metadata } from "next";

import { LossOpportunityForm } from "@/components/forms/loss-opportunity-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

  const failingChecks = diag.checks.filter((check) => !check.ok);

  const collectionsCheck = diag.checks.find((check) => check.label.startsWith("collections"));
  const colorsCheck = diag.checks.find((check) => check.label.startsWith("colors"));

  const bannerChecks = [
    { label: "Reps", check: diag.checks.find((item) => item.label === "sales-reps") },
    { label: "Dealers", check: diag.checks.find((item) => item.label === "dealers-by-rep") },
    { label: "Categorías", check: diag.checks.find((item) => item.label === "categories") },
    { label: "Colecciones", check: collectionsCheck },
    { label: "Colores", check: colorsCheck },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 py-10">
      <div className="space-y-3 text-center md:text-left">
        <h1 className="font-montserrat text-3xl font-semibold">Sales Ops Forms</h1>
        <p className="text-sm text-muted-foreground">
          Comparte pérdidas de oportunidad con Sales Ops. Conectamos los catálogos de MBIC y
          notificamos a tu agente n8n automáticamente.
        </p>
        {diag.checks.length > 0 ? (
          <div className="rounded-md border border-border/60 bg-muted/30 p-3">
            <div className="flex flex-wrap items-center justify-center gap-2 text-xs md:justify-start">
              {bannerChecks.map(({ label, check }) =>
                check ? (
                  <Badge key={label} variant={check.ok ? "outline" : "destructive"}>
                    {label}: {check.ok ? check.count : check.err ?? "offline"} (
                    HTTP {check.status})
                  </Badge>
                ) : (
                  <Badge key={label} variant="destructive">
                    {label}: sin datos
                  </Badge>
                ),
              )}
            </div>
          </div>
        ) : null}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pérdida de oportunidad (Loss Opportunity)</CardTitle>
          <CardDescription>
            Captura reps, dealers y colecciones con asistencia poka-yoke. Calculamos el monto
            potencial automáticamente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LossOpportunityForm
            initialSalesReps={salesReps.data}
            initialCategories={categories.data}
          />
        </CardContent>
      </Card>

      {failingChecks.length > 0 ? (
        <p className="text-xs text-destructive">
          Algunas dependencias están fuera de línea. Revisa los webhooks y catálogos antes de usar
          el formulario.
        </p>
      ) : null}
    </div>
  );
}
