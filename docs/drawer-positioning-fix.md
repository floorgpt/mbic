# Florida Regional Sales Map - Drawer Not Opening Fix

## Issue Summary

**Date**: 2025-11-20
**Symptom**: Clicking regions or ZIP circles showed gray overlay but drawer content didn't appear
**Component**: `components/dashboard/florida-regional-sales-map.tsx`

## Root Cause

The `SheetContent` component had conflicting CSS positioning classes:

```tsx
// ❌ BROKEN - relative positioning conflicts with Sheet's fixed overlay
<SheetContent className="w-full sm:max-w-2xl md:max-w-3xl flex flex-col z-50 px-6 relative">
```

**Problem**: The `relative` class prevented the Sheet from being positioned as a `fixed` overlay, which is required by Radix UI Dialog/Sheet primitive. This caused:
- Gray overlay appeared (Sheet root was rendering)
- Drawer content was positioned incorrectly and invisible
- User could see light gray background but no content

## The Fix

Changed SheetContent className to match the working pattern from `dealer-sales-pulse.tsx`:

```tsx
// ✅ FIXED - removed conflicting classes
<SheetContent className="w-full sm:max-w-2xl md:max-w-3xl flex flex-col overflow-hidden">
```

**Changes Made**:
1. ❌ Removed `relative` - conflicted with Sheet's `fixed` positioning
2. ❌ Removed `z-50` - redundant (Sheet component already applies z-50)
3. ❌ Removed `px-6` - padding should be in SheetHeader instead
4. ✅ Added `overflow-hidden` - matches working Dealer Activity pattern

## Technical Details

### Radix UI Sheet Component Behavior

The Sheet component (from `@radix-ui/react-dialog`) uses:
- `SheetOverlay`: `fixed inset-0 z-50` (gray background)
- `SheetContent`: `fixed z-50` with slide-in animations (drawer content)

When `relative` positioning is applied to SheetContent, it breaks the `fixed` positioning and the content cannot render as an overlay.

### Working Reference

**File**: `components/dashboard/dealer-sales-pulse.tsx:680`

```tsx
<Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
  <SheetContent className="w-full sm:max-w-lg flex flex-col overflow-hidden">
    {/* Content */}
  </SheetContent>
</Sheet>
```

## Prevention

**Rule**: Never apply `relative` or `absolute` positioning to `SheetContent`. The component requires `fixed` positioning (applied internally by Radix UI) to function as an overlay.

**Allowed Classes**:
- ✅ Width/max-width (`w-full`, `sm:max-w-2xl`)
- ✅ Display (`flex`, `grid`)
- ✅ Flex direction (`flex-col`)
- ✅ Overflow (`overflow-hidden`, `overflow-auto`)
- ❌ Position (`relative`, `absolute`, `fixed`, `sticky`)
- ❌ Z-index (`z-*`) - already handled by Sheet component

## Verification

1. Click any region polygon on the map
2. Gray overlay appears
3. Drawer slides in from right with content visible
4. Click any blue ZIP circle
5. Drawer updates with ZIP-specific dealer details

Both flows should work correctly.

## Related Files

- Main component: [florida-regional-sales-map.tsx](../components/dashboard/florida-regional-sales-map.tsx)
- Sheet component: [sheet.tsx](../components/ui/sheet.tsx)
- Reference (working): [dealer-sales-pulse.tsx](../components/dashboard/dealer-sales-pulse.tsx)
- Architecture: [chat-overlay-architecture.md](./chat-overlay-architecture.md)
