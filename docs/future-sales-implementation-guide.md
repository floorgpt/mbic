# Future Sales Form - Implementation Guide

## Overview
This document provides step-by-step instructions to implement the Future Sales opportunity form that writes to the `future_sale_opportunities` table in Supabase.

## Database Schema

**Table**: `future_sale_opportunities`

Key fields:
- `project_name` (text, required) - Project identifier
- `rep_id` (integer, required) - Sales rep FK
- `dealer_id` (integer, required) - Dealer FK
- `expected_qty` (numeric, required) - Quantity expected
- `expected_unit_price` (numeric) - Price per unit
- `probability_pct` (numeric, required) - 0-100 probability
- `expected_close_date` (date, optional) - Expected close date
- `needed_by_date` (date, optional) - Date needed by
- `expected_sku` (text, optional) - SKU identifier
- `status` (text) - Default: "open"
- `ops_stock_confirmed` (boolean) - Default: false
- `notes` (text, optional) - Additional notes

## Implementation Steps

### Step 1: Add Type Definitions

**File**: `types/forms.ts`

Add after `LossOpportunityPayload`:

```typescript
export type FutureSalePayload = {
  projectName: string;
  repId: number;
  dealerId: number;
  categoryKey: string | null;
  collectionKey: string | null;
  colorName: string | null;
  expectedQty: number;
  expectedUnitPrice: number;
  potentialAmount: number;
  probabilityPct: number; // 0-100
  expectedCloseDate: string | null; // ISO date
  neededByDate: string | null; // ISO date
  notes: string | null;
  expectedSku: string | null;
};
```

### Step 2: Add Database Types

**File**: `types/database.ts`

Add after `LossOpportunityInsert`:

```typescript
export type FutureSaleOpportunityRow = {
  id: number;
  project_name: string;
  dealer_id: number;
  rep_id: number;
  expected_close_date: string | null;
  needed_by_date: string | null;
  expected_sku: string | null;
  expected_qty: number;
  expected_unit_price: number | null;
  probability_pct: number;
  ops_stock_confirmed: boolean;
  ops_confirmed_at: string | null;
  status: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type FutureSaleOpportunityInsert = {
  id?: number;
  project_name: string;
  dealer_id: number;
  rep_id: number;
  expected_close_date?: string | null;
  needed_by_date?: string | null;
  expected_sku?: string | null;
  expected_qty: number;
  expected_unit_price?: number | null;
  probability_pct?: number;
  ops_stock_confirmed?: boolean;
  ops_confirmed_at?: string | null;
  status?: string;
  notes?: string | null;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
};
```

### Step 3: Create Backend Logic

**File**: `lib/forms/future-sale.ts` (NEW FILE)

See detailed implementation in the plan agent output above. Key functions:
- `validateFutureSalePayload()` - Validates form data
- `insertFutureSale()` - Inserts into database
- `triggerFutureSaleWebhook()` - Fires webhook (non-blocking)

### Step 4: Create API Route

**File**: `app/api/forms/future-sale/route.ts` (NEW FILE)

POST endpoint that:
1. Validates payload
2. Checks catalog integrity (if STRICT mode)
3. Inserts into `future_sale_opportunities`
4. Triggers webhook
5. Returns success with ID

### Step 5: Add Submit Helper

**File**: `lib/forms/submit.ts`

Add function:

```typescript
export async function createFutureSale(
  payload: FutureSalePayload,
): Promise<{ ok: boolean; id?: number | null; err?: string | null }> {
  const response = await fetch("/api/forms/future-sale", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!response.ok || !result.ok) {
    return { ok: false, err: result.err ?? "No pudimos registrar" };
  }

  return { ok: true, id: result.id ?? null };
}
```

### Step 6: Create Frontend Form Component

**File**: `components/forms/future-sale-form.tsx` (NEW FILE)

Clone from `loss-opportunity-form.tsx` with these changes:

**New Fields**:
- Project Name (text input, required)
- Probability % (number input 0-100, required)
- Expected Close Date (date input, optional)
- Needed By Date (date input, optional)

**Removed Fields**:
- Reason (dropdown) - not applicable for future sales

**Labels Changed**:
- "Cantidad Perdida" → "Cantidad Esperada"
- "Target Price" → "Precio Unitario"
- "Registrar Pérdida" → "Registrar Oportunidad Futura"

**Success Message**:
"¡Oportunidad futura registrada exitosamente! (ID: X)"

### Step 7: Wire Form to Page

**File**: `components/forms/forms-page-client.tsx`

1. Import `FutureSaleForm`
2. Add selection handler
3. Replace `<FutureSalesComingSoon />` with:

```typescript
{selectedForm === "future" ? (
  <FutureSaleForm
    initialSalesReps={initialSalesReps}
    initialCategories={initialCategories}
    onCatalogStatus={handleCatalogStatus}
    onSelectionChange={handleFutureSaleSelectionChange}
  />
) : null}
```

## Testing

### Manual Test Flow:

1. Navigate to `/forms`
2. Select "Oportunidad futura (Future Sales)" from dropdown
3. Fill in required fields:
   - Project Name: "Test Project"
   - Rep: Any
   - Dealer: Any
   - Expected Qty: 1000
   - Unit Price: $2.50
   - Probability: 75%
4. Optional fields:
   - Category/Collection/Color
   - Expected Close Date
   - Needed By Date
   - Notes
5. Click "Registrar Oportunidad Futura"
6. Verify success message with ID
7. Check Supabase for new record

### Curl Test:

```bash
curl -X POST http://localhost:3000/api/forms/future-sale \
  -H "Content-Type: application/json" \
  -d '{
    "projectName": "Test Project",
    "repId": 3,
    "dealerId": 176,
    "categoryKey": "vinyl",
    "collectionKey": "Spirit",
    "colorName": "Cerise",
    "expectedQty": 1000,
    "expectedUnitPrice": 2.50,
    "potentialAmount": 2500,
    "probabilityPct": 75,
    "expectedCloseDate": "2025-12-31",
    "neededByDate": null,
    "notes": "Test from API",
    "expectedSku": "Spirit:Cerise"
  }'
```

## Files Checklist

### New Files to Create:
- [ ] `lib/forms/future-sale.ts`
- [ ] `app/api/forms/future-sale/route.ts`
- [ ] `components/forms/future-sale-form.tsx`

### Files to Modify:
- [ ] `types/forms.ts` - Add `FutureSalePayload`
- [ ] `types/database.ts` - Add `FutureSaleOpportunityRow` and `Insert`
- [ ] `lib/forms/submit.ts` - Add `createFutureSale()`
- [ ] `components/forms/forms-page-client.tsx` - Wire new form

## Key Differences vs Loss Opportunity Form

| Aspect | Loss Opportunity | Future Sale |
|--------|------------------|-------------|
| Table | `loss_opportunities` | `future_sale_opportunities` |
| Primary Field | Reason (dropdown) | Project Name (text) |
| Quantity Label | "Perdida" (Lost) | "Esperada" (Expected) |
| Additional Fields | - | Probability %, Close Date, Needed By Date |
| Button Text | "Registrar Pérdida" | "Registrar Oportunidad Futura" |
| Success Message | "Pérdida registrada" | "Oportunidad futura registrada" |

## Notes

- Catalog validation (Category/Collection/Color) is optional for both forms
- Webhook fires in background (non-blocking)
- Form resets after successful submission (keeps rep/dealer)
- All date fields use native HTML5 date inputs
- Probability must be between 0-100

## Next Steps After Implementation

1. Test all validation scenarios
2. Verify database inserts
3. Test webhook (optional)
4. Add RLS policies if needed
5. Document for end users
