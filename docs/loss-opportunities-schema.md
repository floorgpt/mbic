# Loss Opportunities Table Schema

## Overview
The `loss_opportunities` table tracks sales opportunities that were lost due to various reasons (stock unavailability, pricing, competition, etc.). This data informs inventory planning, pricing strategy, and sales operations.

## Logical Column Order

### Core Fields (Primary Business Keys)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `id` | serial | NO | Primary key, auto-incremented |
| `dealer_id` | integer | NO | Foreign key to customers_demo.customer_id |
| `rep_id` | integer | NO | Foreign key to sales_reps_demo.rep_id |
| `lost_date` | date | NO | Date when opportunity was lost |
| `requested_qty` | numeric | NO | Quantity requested (SqFt) |
| `target_price` | numeric | YES | Target price per SqFt ($/SqFt) |
| `potential_amount` | numeric | NO | Potential revenue (qty × price) |

### Business Fields (Loss Context)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `due_to_stock` | boolean | YES | True if loss was due to stock unavailability |
| `lost_reason` | text | NO | Reason code: `no_stock`, `price`, `competitor`, `cancelled`, `other` |
| `notes` | text | YES | Additional context or notes |

### Product Fields (Product Identification)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `category_key` | text | YES | Product category key (e.g., vinyl, laminate) |
| `collection` | text | YES | Collection/series name |
| `color` | text | YES | Color name |
| `expected_sku` | text | YES | Expected SKU identifier (collection:color) |
| `sku` | text | YES | Actual SKU if known at time of loss |

### Audit Fields (Timestamps)
| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `created_at` | timestamp | YES | Record creation timestamp (auto-set) |
| `updated_at` | timestamp | YES | Last update timestamp (if exists) |

## Recent Changes

### 2025-01-10: Target Price Addition
- **Added:** `target_price` column (numeric, nullable)
- **Removed:** `needed_by_date` column (if existed)
- **Reason:** Frontend form captures $/SqFt pricing but wasn't being stored

**Migration:** `20250110_loss_opportunities_target_price.sql`

### Example Record
```json
{
  "id": 3,
  "dealer_id": 1002,
  "rep_id": 1,
  "lost_date": "2025-01-10",
  "requested_qty": 4500,
  "target_price": 1.75,
  "potential_amount": 7875,
  "due_to_stock": true,
  "lost_reason": "no_stock",
  "notes": "Juan Pedro/Bright Flooring/Vinyl/Alpha/Nebbia Gray",
  "category_key": "vinyl",
  "collection": "Alpha",
  "color": "Nebbia Gray",
  "expected_sku": "Alpha:Nebbia Gray",
  "sku": null,
  "created_at": "2025-01-10T15:30:00Z"
}
```

## Related Files
- Type definitions: `/types/database.ts`
- Insert logic: `/lib/forms/loss-opportunity.ts`
- Frontend form: `/components/forms/loss-opportunity-form.tsx`
- API route: `/app/api/forms/loss-opportunity/route.ts`

## Notes
- PostgreSQL does not physically reorder columns without a full table rebuild
- The logical order above represents the intended conceptual grouping
- Actual column order in `information_schema.columns` may differ
