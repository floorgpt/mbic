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
import { createLossOpportunity } from "@/lib/forms/submit";
import { cn } from "@/lib/utils";
import type {
  CategoryOption,
  ColorOption,
  CollectionOption,
  DealerOption,
  LossOpportunityPayload,
  LossReason,
  SalesRepOption,
} from "@/types/forms";

export type LossOpportunitySelection = {
  repId: string;
  categoryKey: string;
  collectionKey: string;
};

type LossOpportunityFormProps = {
  initialSalesReps: SalesRepOption[];
  initialCategories: CategoryOption[];
  onSelectionChange?: (selection: LossOpportunitySelection) => void;
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
  repId: string;
  dealerId: string;
  categoryKey: string;
  collectionKey: string;
  colorName: string;
  reason: LossReason;
  requestedQty: string;
  targetPrice: string;
  notes: string;
};

type FormErrors = Partial<Record<keyof FormValues, string>>;

type StatusMessage = {
  type: "success" | "error";
  text: string;
};

const LOSS_REASONS: Array<{ value: LossReason; label: string }> = [
  { value: "no_stock", label: "No stock" },
  { value: "price", label: "Precio" },
  { value: "competitor", label: "Competencia" },
  { value: "cancelled", label: "Cancelado" },
  { value: "other", label: "Otro" },
];

const EMPTY_CATALOG: CatalogState<never> = {
  data: [],
  loading: false,
  error: null,
};

const DEFAULT_VALUES: FormValues = {
  repId: "",
  dealerId: "",
  categoryKey: "",
  collectionKey: "",
  colorName: "",
  reason: "no_stock",
  requestedQty: "",
  targetPrice: "",
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

export function LossOpportunityForm({
  initialSalesReps,
  initialCategories,
  onCatalogStatus,
  onSelectionChange,
}: LossOpportunityFormProps) {
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
  useEffect(() => {
    onSelectionChange?.({
      repId: values.repId,
      categoryKey: values.categoryKey,
      collectionKey: values.collectionKey,
    });
  }, [onSelectionChange, values.categoryKey, values.collectionKey, values.repId]);

  const potentialAmount = useMemo(
    () => computePotentialAmount(values.requestedQty, values.targetPrice),
    [values.requestedQty, values.targetPrice],
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

    if (!values.repId) nextErrors.repId = "Selecciona un representante de ventas";
    if (!values.dealerId) nextErrors.dealerId = "Selecciona un dealer";
    if (!values.categoryKey) nextErrors.categoryKey = "Selecciona una categoría";
    if (!values.collectionKey) nextErrors.collectionKey = "Selecciona una colección";
    if (!values.colorName) nextErrors.colorName = "Selecciona un color";

    const qty = parsePositiveNumber(values.requestedQty);
    if (!qty) {
      nextErrors.requestedQty = "Ingresa la cantidad perdida (mayor a 0)";
    }

    const price = parsePositiveNumber(values.targetPrice);
    if (!price) {
      nextErrors.targetPrice = "Ingresa el precio objetivo (mayor a 0)";
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

    const qty = parsePositiveNumber(values.requestedQty) ?? 0;
    const price = parsePositiveNumber(values.targetPrice) ?? 0;

    const payload: LossOpportunityPayload = {
      repId: Number.parseInt(values.repId, 10),
      dealerId: Number.parseInt(values.dealerId, 10),
      categoryKey: values.categoryKey || null,
      collectionKey: values.collectionKey || null,
      colorName: values.colorName || null,
      requestedQty: qty,
      targetPrice: price,
      potentialAmount: computePotentialAmount(values.requestedQty, values.targetPrice),
      reason: values.reason,
      notes: values.notes?.trim() ? values.notes.trim() : null,
      expectedSku:
        values.collectionKey && values.colorName
          ? `${values.collectionKey}:${values.colorName}`
          : null,
    };

    setSubmitting(true);
    try {
      const result = await createLossOpportunity(payload);
      if (result.ok) {
        const id = (result as { id?: number | null }).id ?? null;
        const webhook = (result as {
          webhook?: { mode?: string; url?: string } | null;
        }).webhook;
        const modeLabel = webhook?.mode ? webhook.mode.toUpperCase() : "?";
        const webhookUrl = webhook?.url ?? "sin URL";
        setStatus({
          type: "success",
          text: `Pérdida registrada (#${id ?? "sin id"}). Webhook ${modeLabel} → ${webhookUrl}`,
        });
        setErrors({});
        setValues((prev) => ({
          ...prev,
          categoryKey: "",
          collectionKey: "",
          colorName: "",
          reason: "no_stock",
          requestedQty: "",
          targetPrice: "",
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

      <FieldGroup className="md:grid-cols-2">
        <Field
          controlId="loss-rep"
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
            <SelectTrigger id="loss-rep" className="w-full">
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
          controlId="loss-dealer"
          label="Dealer"
          required
          error={errors.dealerId ?? dealersState.error}
        >
          <Select
            value={values.dealerId}
            onValueChange={(value) => handleValueChange("dealerId", value)}
            disabled={!values.repId || dealersState.loading || dealersState.data.length === 0}
          >
            <SelectTrigger id="loss-dealer" className="w-full">
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
          controlId="loss-category"
          label="Categoría"
          required
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
            <SelectTrigger id="loss-category" className="w-full">
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
          controlId="loss-collection"
          label="Colección"
          required
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
            <SelectTrigger id="loss-collection" className="w-full">
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
          controlId="loss-color"
          label="Color"
          required
          error={errors.colorName ?? colorsState.error}
        >
          <Select
            value={values.colorName}
            onValueChange={(value) => handleValueChange("colorName", value)}
            disabled={!values.collectionKey || colorsState.loading || colorsState.data.length === 0}
          >
            <SelectTrigger id="loss-color" className="w-full">
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
        <Field controlId="loss-reason" label="Reason" required>
          <Select
            value={values.reason}
            onValueChange={(value) => handleValueChange("reason", value as LossReason)}
          >
            <SelectTrigger id="loss-reason" className="w-full">
              <SelectValue placeholder="Selecciona motivo" />
            </SelectTrigger>
            <SelectContent>
              {LOSS_REASONS.map((reason) => (
                <SelectItem key={reason.value} value={reason.value}>
                  {reason.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <Field
          controlId="loss-qty"
          label="Quantity Lost (SqFt)"
          required
          error={errors.requestedQty ?? null}
        >
          <Input
            id="loss-qty"
            type="text"
            inputMode="decimal"
            value={values.requestedQty}
            onChange={(event) => handleValueChange("requestedQty", event.target.value)}
            onFocus={() => handleValueChange("requestedQty", sanitizeNumeric(values.requestedQty))}
            onBlur={() => handleValueChange("requestedQty", formatQuantityDisplay(values.requestedQty))}
            aria-invalid={Boolean(errors.requestedQty)}
          />
        </Field>

        <Field
          controlId="loss-price"
          label="Target Price ($/SqFt)"
          required
          error={errors.targetPrice ?? null}
        >
          <div className="relative">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
              $
            </span>
            <Input
              id="loss-price"
              type="text"
              inputMode="decimal"
              value={values.targetPrice}
              onChange={(event) => handleValueChange("targetPrice", event.target.value)}
              onFocus={() => handleValueChange("targetPrice", sanitizeNumeric(values.targetPrice))}
              onBlur={() => handleValueChange("targetPrice", formatPriceDisplay(values.targetPrice))}
              aria-invalid={Boolean(errors.targetPrice)}
              className="pl-7"
            />
          </div>
        </Field>
      </FieldGroup>

      <Field
        controlId="loss-total"
        label="Total Opportunity ($)"
        description="Se calcula automáticamente"
      >
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
            $
          </span>
          <Input
            id="loss-total"
            value={formattedPotentialAmount.replace("$", "")}
            readOnly
            tabIndex={-1}
            className="pl-7"
          />
        </div>
      </Field>

      <Field controlId="loss-notes" label="Notas adicionales" description="Opcional">
        <textarea
          id="loss-notes"
          value={values.notes}
          onChange={(event) => handleValueChange("notes", event.target.value)}
          className="border-input focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] dark:bg-input/30 w-full min-h-24 rounded-md border bg-transparent px-3 py-2 text-sm outline-none"
        />
      </Field>

      <div className="space-y-3 md:flex md:items-center md:justify-between md:space-y-0">
        <p className="text-xs text-muted-foreground">
          Al enviar registramos la pérdida y notificamos a Sales Ops.
        </p>
        <div className="sticky bottom-4 z-10 md:static md:bottom-auto md:z-auto md:w-auto">
          <Button type="submit" disabled={submitting} className="w-full md:w-auto shadow-sm">
            {submitting ? "Enviando..." : "Registrar pérdida"}
          </Button>
        </div>
      </div>
    </form>
  );
}
