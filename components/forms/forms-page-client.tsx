"use client";

import { useCallback, useMemo, useState } from "react";

import { Field } from "@/components/forms/field";
import { LossOpportunityForm } from "@/components/forms/loss-opportunity-form";
import { FormsStatusCard, type FormsStatusChip } from "@/components/forms/status-card";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CategoryOption, SalesRepOption } from "@/types/forms";

const FORM_OPTIONS = [
  {
    value: "loss" as const,
    label: "Pérdida de oportunidad (Loss Opportunity)",
  },
  {
    value: "future" as const,
    label: "Oportunidad futura (Future Sales)",
  },
];

type FormOptionValue = (typeof FORM_OPTIONS)[number]["value"] | "";

type SummaryCheck = {
  label: string;
  ok: boolean;
  status: number;
  count: number;
  err: string | null;
};

type FormsPageClientProps = {
  initialSalesReps: SalesRepOption[];
  initialCategories: CategoryOption[];
  diagChecks: SummaryCheck[];
};

export function FormsPageClient({
  initialSalesReps,
  initialCategories,
  diagChecks,
}: FormsPageClientProps) {
  const [selectedForm, setSelectedForm] = useState<FormOptionValue>("");
  const [catalogErrors, setCatalogErrors] = useState<Record<string, string>>({});

  const handleCatalogStatus = useCallback((source: "dealers" | "collections" | "colors", error: string | null) => {
    setCatalogErrors((prev) => {
      if (error) {
        return { ...prev, [source]: error };
      }
      const next = { ...prev };
      delete next[source];
      return next;
    });
  }, []);

  const diagAlert = useMemo(() => {
    const failures = diagChecks.filter((check) => !check.ok);
    if (!failures.length) return null;
    return "Algunas dependencias están fuera de línea. Revisa webhooks/catálogos antes de usar el formulario.";
  }, [diagChecks]);

  const chips: FormsStatusChip[] = useMemo(() => {
    const findCheck = (predicate: (label: string) => boolean) =>
      diagChecks.find((check) => predicate(check.label));

    const defaults = (id: string, label: string) => ({
      id,
      label,
      ok: false,
      status: 0,
      count: 0,
      err: "sin datos",
    });

    return [
      { id: "reps", label: "Reps", check: diagChecks.find((item) => item.label === "sales-reps") },
      { id: "dealers", label: "Dealers", check: diagChecks.find((item) => item.label === "dealers-by-rep") },
      { id: "categories", label: "Categorías", check: diagChecks.find((item) => item.label === "categories") },
      { id: "collections", label: "Colecciones", check: findCheck((label) => label.startsWith("collections")) },
      { id: "colors", label: "Colores", check: findCheck((label) => label.startsWith("colors")) },
    ].map(({ id, label, check }) =>
      check
        ? {
            id,
            label,
            ok: check.ok,
            status: check.status,
            count: check.count,
            err: check.err,
          }
        : defaults(id, label),
    );
  }, [diagChecks]);

  const activeMessages = useMemo(() => {
    const messages = new Set<string>();
    if (diagAlert) {
      messages.add(diagAlert);
    }
    Object.values(catalogErrors).forEach((msg) => messages.add(msg));
    return Array.from(messages);
  }, [catalogErrors, diagAlert]);

  const handleSelectChange = (value: string) => {
    const nextValue = (value as FormOptionValue) ?? "";
    setSelectedForm(nextValue);
    if (nextValue !== "loss") {
      setCatalogErrors({});
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 py-10">
      <div className="space-y-3 text-center md:text-left">
        <h1 className="font-montserrat text-3xl font-semibold">Sales Ops Forms</h1>
        <p className="text-sm text-muted-foreground">
          Comparte pérdidas de oportunidad y ventas futuras con Sales Ops.
        </p>
      </div>

      <FormsStatusCard chips={chips} messages={activeMessages} />

      <Card>
        <CardHeader>
          <CardTitle>Reporta una actualización</CardTitle>
          <CardDescription>Selecciona el tipo de formulario que quieres enviar.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Field controlId="forms-selector" label="¿Qué quieres reportar?" required>
            <Select value={selectedForm} onValueChange={handleSelectChange}>
              <SelectTrigger id="forms-selector" className="w-full">
                <SelectValue placeholder="Selecciona una opción" />
              </SelectTrigger>
              <SelectContent>
                {FORM_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          {selectedForm === "" ? (
            <p className="text-sm text-muted-foreground">
              Selecciona un formulario para comenzar a capturar información.
            </p>
          ) : null}

          {selectedForm === "loss" ? (
            <LossOpportunityForm
              initialSalesReps={initialSalesReps}
              initialCategories={initialCategories}
              onCatalogStatus={handleCatalogStatus}
            />
          ) : null}

          {selectedForm === "future" ? <FutureSalesComingSoon /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function FutureSalesComingSoon() {
  return (
    <div className="rounded-lg border border-dashed border-border/60 bg-muted/30 p-6 text-center">
      <h3 className="font-montserrat text-lg font-semibold">Oportunidad futura</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        Estamos preparando este flujo para que compartas ventas futuras con Sales Ops. Próximamente
        podrás registrar proyectos, fechas estimadas y cantidades planificadas.
      </p>
    </div>
  );
}
