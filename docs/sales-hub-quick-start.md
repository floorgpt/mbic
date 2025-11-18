# Sales Hub - Quick Start Guide

## Access
Navigate to: **Settings → Sales Hub** tab

## Quick Actions

### ➕ Add New Sales Rep (30 seconds)
1. Click **"Add Rep"** button
2. Enter full name (e.g., "Maria Garcia")
3. Click **"Save"**
4. ✅ Rep created with 12-month default targets ($200k each)

### ✏️ Edit Target (10 seconds)
1. Click on any target cell (e.g., "200k")
2. Type new amount (e.g., "250000")
3. Press **Enter** to save
4. ✅ Target updated immediately

### 📤 Bulk Upload Targets (2 minutes)
1. Click **"CSV Template"** → Downloads template
2. Open in Excel, edit amounts
3. Click **"Upload CSV"** → Select file
4. ✅ All targets updated at once

## Common Workflows

### New Hire Setup
```
Add Rep → "John Smith" → Save
(12 months × $200k targets auto-created)
```

### Q1 Planning
```
Download CSV → Edit Jan/Feb/Mar targets → Upload CSV
```

### Stretch Goal for Top Performer
```
Click March cell → Change 200000 to 250000 → Enter
```

## CSV Format
```csv
rep_id,target_month,target_amount
1,2025-01,250000
1,2025-02,250000
2,2025-01,180000
```

## Keyboard Shortcuts
- **Enter** - Save editing target
- **Escape** - Cancel editing
- **Tab** - (Future) Navigate to next cell

## Tips
- Amounts display as "$200k" but edit as "200000"
- Year selector affects entire table view
- CSV upload uses UPSERT (safe to re-upload)
- Targets default to $200k if not set

## Need Help?
See full documentation: [sales-hub-settings.md](./sales-hub-settings.md)
