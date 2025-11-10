"use client";

import { useEffect, useMemo, useState, type FormEventHandler } from "react";

import { Field, FieldGroup } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createFutureSale } from "@/lib/forms/submit";
import { cn } from "@/lib/utils";
import type {
  CategoryOption,
  ColorOption,
  CollectionOption,
  DealerOption,
  FutureSalePayload,
  SalesRepOption,
} from "@/types/forms";

export type FutureSaleSelection = {
  repId: string;
  categoryKey: string;
  collectionKey: string;
};

type FutureSaleFormProps = {
  initialSalesReps: SalesRepOption[];
  initialCategories: CategoryOption[];
  onSelectionChange?: (selection: FutureSaleSelection) => void;
  onCatalogStatus?: (source: "dealers" | "collections" | "colors", error: string | null) => void;
};

type CatalogResponse<T> = {
  ok: boolean;
  data: T[];
  err?: string | null;
};

type CatalogState<T> = {
  data: T[];
  loading: boolean;
  error: string | null;
};

type FormValues = {
  projectName: string;
  repId: string;
  dealerId: string;
  categoryKey: string;
  collectionKey: string;
  colorName: string;
  expectedQty: string;
  expectedUnitPrice: string;
  probabilityPct: string;
  expectedCloseDate: string;
  neededByDate: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

const EMPTY_CATALOG: CatalogState<never> = {
  data: [],
  loading: false,
  error: null,
};

const DEFAULT_VALUES: FormValues = {
  projectName: "",
  repId: "",
  dealerId: "",
  categoryKey: "",
  collectionKey: "",
  colorName: "",
  expectedQty: "",
  expectedUnitPrice: "",
  probabilityPct: "",
  expectedCloseDate: "",
  neededByDate: "",
  notes: "",
};

function sanitizeNumeric(value: string): string {
  return value.replace(/[,$\s]/g, "");
}

function parsePositiveNumber(value: string): number | null {
  if (!value) return null;
  const cleaned = sanitizeNumeric(value);
  if (!cleaned) return null;
  const parsed = Number.parseFloat(cleaned);
  if (!Number.isFinite(parsed) || parsed <= 0) return null;
  return parsed;
}

function computePotentialAmount(quantity: string, price: string): number {
  const qty = parsePositiveNumber(quantity);
  const rate = parsePositiveNumber(price);
  if (!qty || !rate) return 0;
  return Math.round(qty * rate * 100) / 100;
}

async function fetchCatalog<T>(url: string, signal: AbortSignal): Promise<CatalogResponse<T>> {
  const response = await fetch(url, { signal });
  const payload = (await response.json()) as CatalogResponse<T>;
  if (!response.ok || !payload?.ok) {
    const err = payload?.err ?? response.statusText;
    throw new Error(err || "Catálogo no disponible");
  }
  return payload;
}

const quantityFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 2,
});

const priceFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

function formatQuantityDisplay(value: string): string {
  const parsed = parsePositiveNumber(value);
  if (parsed == null) {
    return value.trim();
  }
  return quantityFormatter.format(parsed);
}

function formatPriceDisplay(value: string): string {
  const parsed = parsePositiveNumber(value);
  if (parsed == null) {
    return value.trim();
  }
  return priceFormatter.format(parsed);
}

export function FutureSaleForm({
  initialSalesReps,
  initialCategories,
  onCatalogStatus,
  onSelectionChange,
}: FutureSaleFormProps) {
  const [values, setValues] = useState<FormValues>(() => ({
    ...DEFAULT_VALUES,
    repId: initialSalesReps.length === 1 ? String(initialSalesReps[0].id) : "",
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [status, setStatus] = useState<StatusMessage | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [dealersState, setDealersState] = useState<CatalogState<DealerOption>>(EMPTY_CATALOG);
  const [collectionsState, setCollectionsState] =
    useState<CatalogState<CollectionOption>>(EMPTY_CATALOG);
  const [colorsState, setColorsState] = useState<CatalogState<ColorOption>>(EMPTY_CATALOG);

  const canSubmit = useMemo(
    () =>
      Boolean(
        values.projectName &&
          values.repId &&
          values.dealerId &&
          values.expectedQty &&
          values.expectedUnitPrice &&
          values.probabilityPct,
      ),
    [
      values.dealerId,
      values.expectedQty,
      values.expectedUnitPrice,
      values.probabilityPct,
      values.projectName,
      values.repId,
    ],
  );

  useEffect(() => {
    onSelectionChange?.({
      repId: values.repId,
      categoryKey: values.categoryKey,
      collectionKey: values.collectionKey,
    });
  }, [onSelectionChange, values.categoryKey, values.collectionKey, values.repId]);

  const potentialAmount = useMemo(
    () => computePotentialAmount(values.expectedQty, values.expectedUnitPrice),
    [values.expectedQty, values.expectedUnitPrice],
  );

  const formattedPotentialAmount = useMemo(() => {
    if (potentialAmount <= 0) return "$0.00";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(potentialAmount);
  }, [potentialAmount]);

  const clearFieldError = (field: keyof FormValues) => {
    setErrors((prev) => {
      if (!(field in prev)) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  };

  const handleValueChange = (field: keyof FormValues, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    clearFieldError(field);
  };

  // Dealers by sales rep
  useEffect(() => {
    const repId = values.repId;
    if (!repId) {
      setDealersState(EMPTY_CATALOG);
      onCatalogStatus?.("dealers", null);
      return;
    }

    const controller = new AbortController();
    setDealersState({ data: [], loading: true, error: null });

    fetchCatalog<DealerOption>(`/api/forms/catalog/dealers?repId=${repId}`, controller.signal)
      .then((res) => {
        setDealersState({ data: res.data ?? [], loading: false, error: null });
        onCatalogStatus?.("dealers", null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message = (error as Error)?.message ?? "No pudimos cargar los dealers";
        setDealersState({ data: [], loading: false, error: message });
        onCatalogStatus?.("dealers", message);
      });

    return () => controller.abort();
  }, [onCatalogStatus, values.repId]);

  // Collections by category
  useEffect(() => {
    const category = values.categoryKey;
    if (!category) {
      setCollectionsState(EMPTY_CATALOG);
      onCatalogStatus?.("collections", null);
      return;
    }

    const controller = new AbortController();
    setCollectionsState({ data: [], loading: true, error: null });

    fetchCatalog<CollectionOption>(
      `/api/forms/catalog/collections?category=${encodeURIComponent(category)}`,
      controller.signal,
    )
      .then((res) => {
        setCollectionsState({ data: res.data ?? [], loading: false, error: null });
        onCatalogStatus?.("collections", null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message = (error as Error)?.message ?? "No pudimos cargar las colecciones";
        setCollectionsState({ data: [], loading: false, error: message });
        onCatalogStatus?.("collections", message);
      });

    return () => controller.abort();
  }, [onCatalogStatus, values.categoryKey]);

  // Colors by collection
  useEffect(() => {
    const collection = values.collectionKey;
    if (!collection) {
      setColorsState(EMPTY_CATALOG);
      onCatalogStatus?.("colors", null);
      return;
    }

    const controller = new AbortController();
    setColorsState({ data: [], loading: true, error: null });

    fetchCatalog<ColorOption>(
      `/api/forms/catalog/colors?collection=${encodeURIComponent(collection)}`,
      controller.signal,
    )
      .then((res) => {
        setColorsState({ data: res.data ?? [], loading: false, error: null });
        onCatalogStatus?.("colors", null);
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        const message = (error as Error)?.message ?? "No pudimos cargar los colores";
        setColorsState({ data: [], loading: false, error: message });
        onCatalogStatus?.("colors", message);
      });

    return () => controller.abort();
  }, [onCatalogStatus, values.collectionKey]);

  const validateForm = (): FormErrors => {
    const nextErrors: FormErrors = {};

    if (!values.projectName.trim()) nextErrors.projectName = "Ingresa el nombre del proyecto";
    if (!values.repId) nextErrors.repId = "Selecciona un representante de ventas";
    if (!values.dealerId) nextErrors.dealerId = "Selecciona un dealer";

    const qty = parsePositiveNumber(values.expectedQty);
    if (!qty) {
      nextErrors.expectedQty = "Ingresa la cantidad esperada (mayor a 0)";
    }

    const price = parsePositiveNumber(values.expectedUnitPrice);
    if (!price) {
      nextErrors.expectedUnitPrice = "Ingresa el precio unitario (mayor a 0)";
    }

    const probability = parsePositiveNumber(values.probabilityPct);
    if (probability == null || probability < 0 || probability > 100) {
      nextErrors.probabilityPct = "Ingresa la probabilidad (0-100)";
    }

    return nextErrors;
  };

  const handleSubmit: FormEventHandler<HTMLFormElement> = async (event) => {
    event.preventDefault();
    setStatus(null);

    const nextErrors = validateForm();
    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setStatus({
        type: "error",
        text: "No pudimos registrar. Revisa campos o intenta de nuevo.",
      });
      return;
    }

    const qty = parsePositiveNumber(values.expectedQty) ?? 0;
    const price = parsePositiveNumber(values.expectedUnitPrice) ?? 0;
    const probability = parsePositiveNumber(values.probabilityPct) ?? 0;

    const payload: FutureSalePayload = {
      projectName: values.projectName.trim(),
      repId: Number.parseInt(values.repId, 10),
      dealerId: Number.parseInt(values.dealerId, 10),
      categoryKey: values.categoryKey || null,
      collectionKey: values.collectionKey || null,
      colorName: values.colorName || null,
      expectedQty: qty,
      expectedUnitPrice: price,
      potentialAmount: computePotentialAmount(values.expectedQty, values.expectedUnitPrice),
      probabilityPct: probability,
      expectedCloseDate: values.expectedCloseDate || null,
      neededByDate: values.neededByDate || null,
      notes: values.notes?.trim() ? values.notes.trim() : null,
      expectedSku:
        values.collectionKey && values.colorName
          ? `${values.collectionKey}:${values.colorName}`
          : null,
    };

    setSubmitting(true);
    try {
      const result = await createFutureSale(payload);
      if (result.ok) {
        const id = (result as { id?: number | null }).id ?? null;
        setStatus({
          type: "success",
          text: id
            ? `¡Oportunidad futura registrada exitosamente! (ID: ${id})`
            : "¡Oportunidad futura registrada exitosamente!",
        });
        setErrors({});
        // Reset form but keep rep and dealer selection
        setValues((prev) => ({
          ...prev,
          projectName: "",
          categoryKey: "",
          collectionKey: "",
          colorName: "",
          expectedQty: "",
          expectedUnitPrice: "",
          probabilityPct: "",
          expectedCloseDate: "",
          neededByDate: "",
          notes: "",
        }));
        setCollectionsState(EMPTY_CATALOG);
        setColorsState(EMPTY_CATALOG);
        onCatalogStatus?.("collections", null);
        onCatalogStatus?.("colors", null);
      } else {
        setStatus({
          type: "error",
          text: result.err ?? "No pudimos registrar. Revisa campos o intenta de nuevo.",
        });
      }
    } catch (error) {
      console.error("[forms] submit:error", error);
      setStatus({
        type: "error",
        text: "No pudimos registrar. Revisa campos o intenta de nuevo.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form className="space-y-6" onSubmit={handleSubmit}>
      {status ? (
        <div
          className={cn(
            "rounded-md border px-3 py-2 text-sm",
            status.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/20 dark:text-emerald-100"
              : "border-destructive/30 bg-destructive/10 text-destructive dark:border-destructive/40 dark:bg-destructive/20",
          )}
        >
          {status.text}
        </div>
      ) : null}

      <Field
        controlId="future-project"
        label="Nombre del proyecto"
        required
        error={errors.projectName ?? null}
      >
        <Input
          id="future-project"
          type="text"
          value={values.projectName}
          onChange={(event) => handleValueChange("projectName", event.target.value)}
          placeholder="ej. Q1 2025 Brightwood Expansion"
          aria-invalid={Boolean(errors.projectName)}
        />
      </Field>

      <FieldGroup className="md:grid-cols-2">
        <Field
          controlId="future-rep"
          label="¿Quién eres? (Rep)"
          required
          error={errors.repId ?? null}
        >
          <Select
            value={values.repId}
            onValueChange={(value) => {
              handleValueChange("repId", value);
              handleValueChange("dealerId", "");
            }}
            disabled={initialSalesReps.length === 0}
          >
            <SelectTrigger id="future-rep" className="w-full">
              <SelectValue placeholder="Selecciona un representante" />
            </SelectTrigger>
            <SelectContent>
              {initialSalesReps.map((rep) => (
                <SelectItem key={rep.id} value={String(rep.id)}>
                  {rep.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          controlId="future-dealer"
          label="Dealer"
          required
          error={errors.dealerId ?? dealersState.error}
        >
          <Select
            value={values.dealerId}
            onValueChange={(value) => handleValueChange("dealerId", value)}
            disabled={!values.repId || dealersState.loading || dealersState.data.length === 0}
          >
            <SelectTrigger id="future-dealer" className="w-full">
              <SelectValue
                placeholder={
                  dealersState.loading ? "Cargando dealers..." : "Selecciona un dealer"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {dealersState.data.map((dealer) => (
                <SelectItem key={dealer.id} value={String(dealer.id)}>
                  {dealer.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup className="md:grid-cols-3">
        <Field
          controlId="future-category"
          label="Categoría (opcional)"
          error={errors.categoryKey ?? null}
        >
          <Select
            value={values.categoryKey}
            onValueChange={(value) => {
              handleValueChange("categoryKey", value);
              handleValueChange("collectionKey", "");
              handleValueChange("colorName", "");
            }}
            disabled={initialCategories.length === 0}
          >
            <SelectTrigger id="future-category" className="w-full">
              <SelectValue placeholder="Selecciona una categoría" />
            </SelectTrigger>
            <SelectContent>
              {initialCategories.map((category) => (
                <SelectItem key={category.key} value={category.key}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          controlId="future-collection"
          label="Colección (opcional)"
          error={errors.collectionKey ?? collectionsState.error}
        >
          <Select
            value={values.collectionKey}
            onValueChange={(value) => {
              handleValueChange("collectionKey", value);
              handleValueChange("colorName", "");
            }}
            disabled={!values.categoryKey || collectionsState.loading || collectionsState.data.length === 0}
          >
            <SelectTrigger id="future-collection" className="w-full">
              <SelectValue
                placeholder={
                  collectionsState.loading
                    ? "Cargando colecciones..."
                    : "Selecciona una colección"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {collectionsState.data.map((collection) => (
                <SelectItem key={collection.key} value={collection.key}>
                  {collection.label ?? collection.key}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          controlId="future-color"
          label="Color (opcional)"
          error={errors.colorName ?? colorsState.error}
        >
          <Select
            value={values.colorName}
            onValueChange={(value) => handleValueChange("colorName", value)}
            disabled={!values.collectionKey || colorsState.loading || colorsState.data.length === 0}
          >
            <SelectTrigger id="future-color" className="w-full">
              <SelectValue
                placeholder={
                  colorsState.loading ? "Cargando colores..." : "Selecciona un color"
                }
              />
            </SelectTrigger>
            <SelectContent>
              {colorsState.data.map((color) => (
                <SelectItem key={color.value} value={color.value}>
                  {color.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </FieldGroup>

      <FieldGroup className="md:grid-cols-3">
        <Field
          controlId="future-qty"
          label="Cantidad Esperada (SqFt)"
          required
          error={errors.expectedQty ?? null}
        >
          <Input
            id="future-qty"
            type="text"
            inputMode="decimal"
            value={values.expectedQty}
            onChange={(event) => handleValueChange("expectedQty", event.target.value)}
            onFocus={() => handleValueChange("expectedQty", sanitizeNumeric(values.expectedQty))}
            onBlur={() => handleValueChange("expectedQty", formatQuantityDisplay(values.expectedQty))}
            aria-invalid={Boolean(errors.expectedQty)}
          />
        </Field>

        <Field
          controlId="future-price"
          label="Precio Unitario ($/SqFt)"
          required
          error={errors.expectedUnitPrice ?? null}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="future-price"
              type="text"
              inputMode="decimal"
              value={values.expectedUnitPrice}
              onChange={(event) => handleValueChange("expectedUnitPrice", event.target.value)}
              onFocus={() => handleValueChange("expectedUnitPrice", sanitizeNumeric(values.expectedUnitPrice))}
              onBlur={() => handleValueChange("expectedUnitPrice", formatPriceDisplay(values.expectedUnitPrice))}
              aria-invalid={Boolean(errors.expectedUnitPrice)}
              className="pl-7"
            />
          </div>
        </Field>

        <Field
          controlId="future-probability"
          label="Probabilidad (%)"
          required
          error={errors.probabilityPct ?? null}
        >
          <Input
            id="future-probability"
            type="text"
            inputMode="numeric"
            value={values.probabilityPct}
            onChange={(event) => handleValueChange("probabilityPct", event.target.value)}
            placeholder="0-100"
            aria-invalid={Boolean(errors.probabilityPct)}
          />
        </Field>
      </FieldGroup>

      <Field
        controlId="future-total"
        label="Monto Potencial ($)"
        description="Se calcula automáticamente"
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="future-total"
            value={formattedPotentialAmount.replace("$", "")}
            readOnly
            tabIndex={-1}
            className="pl-7"
          />
        </div>
      </Field>

      <FieldGroup className="md:grid-cols-2">
        <Field
          controlId="future-close-date"
          label="Expected Close Date (opcional)"
        >
          <Input
            id="future-close-date"
            type="date"
            value={values.expectedCloseDate}
            onChange={(event) => handleValueChange("expectedCloseDate", event.target.value)}
          />
        </Field>

        <Field
          controlId="future-needed-date"
          label="Needed By Date (opcional)"
        >
          <Input
            id="future-needed-date"
            type="date"
            value={values.neededByDate}
            onChange={(event) => handleValueChange("neededByDate", event.target.value)}
          />
        </Field>
      </FieldGroup>

      <Field controlId="future-notes" label="Notas adicionales" description="Opcional">
        <textarea
          id="future-notes"
          value={values.notes}
          onChange={(event) => handleValueChange("notes", event.target.value)}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30 w-full min-h-24 rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
        />
      </Field>

      <div className="space-y-3 md:flex md:items-center md:justify-between md:space-y-0">
        <p className="text-xs text-muted-foreground">
          Al enviar registramos la oportunidad futura y notificamos a Sales Ops.
        </p>
        <div className="sticky bottom-4 z-10 md:static md:bottom-auto md:z-auto md:w-auto">
          <Button
            type="submit"
            disabled={submitting || !canSubmit}
            className="w-full md:w-auto shadow-sm"
          >
            {submitting ? "Enviando..." : "Registrar Oportunidad"}
          </Button>
        </div>
      </div>
    </form>
  );
}
