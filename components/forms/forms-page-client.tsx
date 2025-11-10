"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { Field } from "@/components/forms/field";
import { FutureSaleForm } from "@/components/forms/future-sale-form";
import {
  LossOpportunityForm,
  type LossOpportunitySelection,
} from "@/components/forms/loss-opportunity-form";
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
  const [dynamicChips, setDynamicChips] = useState<FormsStatusChip[]>([]);
  const [selection, setSelection] = useState<LossOpportunitySelection>({
    repId: "",
    categoryKey: "",
    collectionKey: "",
  });

  const handleCatalogStatus = useCallback(
    (source: "dealers" | "collections" | "colors", error: string | null) => {
      setCatalogErrors((prev) => {
        if (error) {
          return { ...prev, [source]: error };
        }
        const next = { ...prev };
        delete next[source];
        return next;
      });
    },
    [],
  );

  const handleSelectionChange = useCallback((next: LossOpportunitySelection) => {
    setSelection(next);
  }, []);

  const baseChips: FormsStatusChip[] = useMemo(
    () =>
      diagChecks
        .filter((check) => check.label === "sales-reps")
        .map((check) => ({
          id: "reps",
          label: "Reps",
          ok: check.ok,
          status: check.status,
          count: check.count,
          err: check.err,
          intent: "required" as const,
        })),
    [diagChecks],
  );

  useEffect(() => {
    if (selectedForm !== "loss") {
      setDynamicChips([]);
      return;
    }

    let cancelled = false;

    type CatalogFetchResponse = {
      ok?: boolean;
      err?: string | null;
      meta?: { ok?: boolean; count?: number; err?: string | null };
      data?: unknown;
    };

    async function fetchChip(url: string) {
      try {
        const response = await fetch(url, { cache: "no-store" });
        let json: CatalogFetchResponse | null = null;
        try {
          json = (await response.json()) as CatalogFetchResponse;
        } catch {
          json = null;
        }
        const ok = response.ok && json?.ok !== false;
        const count = json?.meta?.count ?? (Array.isArray(json?.data) ? json.data.length : 0);
        const err = ok ? json?.meta?.err ?? null : json?.meta?.err ?? json?.err ?? response.statusText ?? "Endpoint failed";
        return { ok, status: response.status, count, err };
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return { ok: false, status: 0, count: 0, err: message };
      }
    }

    (async () => {
      const chips: FormsStatusChip[] = [];

      const categories = await fetchChip("/api/forms/catalog/categories");
      chips.push({
        id: "categories",
        label: "Categorías",
        intent: "required",
        ...categories,
      });

      if (selection.repId) {
        const dealers = await fetchChip(`/api/forms/catalog/dealers?repId=${encodeURIComponent(selection.repId)}`);
        chips.push({
          id: "dealers",
          label: "Dealers",
          intent: "optional",
          ...dealers,
        });
      } else {
        chips.push({
          id: "dealers",
          label: "Dealers",
          intent: "optional",
          ok: true,
          status: 200,
          count: 0,
          err: "Sin selección",
        });
      }

      if (selection.categoryKey) {
        const collections = await fetchChip(
          `/api/forms/catalog/collections?category=${encodeURIComponent(selection.categoryKey)}`,
        );
        chips.push({
          id: "collections",
          label: "Colecciones",
          intent: "required",
          ...collections,
        });
      } else {
        chips.push({
          id: "collections",
          label: "Colecciones",
          intent: "required",
          ok: true,
          status: 200,
          count: 0,
          err: "Sin selección",
        });
      }

      if (selection.collectionKey) {
        const colors = await fetchChip(
          `/api/forms/catalog/colors?collection=${encodeURIComponent(selection.collectionKey)}`,
        );
        chips.push({
          id: "colors",
          label: "Colores",
          intent: "optional",
          ...colors,
        });
      } else {
        chips.push({
          id: "colors",
          label: "Colores",
          intent: "optional",
          ok: true,
          status: 200,
          count: 0,
          err: "Sin selección",
        });
      }

      if (!cancelled) {
        setDynamicChips(chips);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selectedForm, selection]);

  const combinedChips = useMemo(
    () => [...baseChips, ...dynamicChips],
    [baseChips, dynamicChips],
  );

  const activeMessages = useMemo(() => {
    const messages = new Set<string>();

    const requiredFailures = combinedChips.filter(
      (chip) => chip.intent !== "optional" && !chip.ok,
    );
    if (requiredFailures.length) {
      messages.add(
        "Algunas dependencias están fuera de línea. Revisa webhooks/catálogos antes de usar el formulario.",
      );
      requiredFailures.forEach((chip) => {
        if (chip.err) {
          messages.add(`${chip.label}: ${chip.err}`);
        }
      });
    }

    combinedChips.forEach((chip) => {
      if (chip.intent === "optional" && chip.err) {
        messages.add(`${chip.label}: ${chip.err}`);
      }
    });

    Object.values(catalogErrors).forEach((msg) => {
      if (msg) {
        messages.add(msg);
      }
    });

    return Array.from(messages);
  }, [catalogErrors, combinedChips]);

  const handleSelectChange = (value: string) => {
    const nextValue = (value as FormOptionValue) ?? "";
    setSelectedForm(nextValue);
    if (nextValue !== "loss") {
      setCatalogErrors({});
      setSelection({ repId: "", categoryKey: "", collectionKey: "" });
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
              onSelectionChange={handleSelectionChange}
            />
          ) : null}

          {selectedForm === "future" ? (
            <FutureSaleForm
              initialSalesReps={initialSalesReps}
              initialCategories={initialCategories}
              onCatalogStatus={handleCatalogStatus}
              onSelectionChange={handleSelectionChange}
            />
          ) : null}
        </CardContent>
      </Card>

      <FormsStatusCard chips={combinedChips} messages={activeMessages} />

      <div className="border-t border-border/30" />

      <div className="text-center text-xs text-muted-foreground">
        CPF Floors - Marketing & B/I Center
      </div>
    </div>
  );
}
