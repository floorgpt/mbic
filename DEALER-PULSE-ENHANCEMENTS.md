# Dealer Pulse Enhancements - Implementation Guide

## Overview
This document outlines all the changes needed to complete the Dealer Pulse feature with accurate dealer counts and enhanced drawer functionality.

## 1. SQL Migrations to Apply

### Migration 1: Fix dealer_activity_month_details RPC
**File**: `supabase/migrations/20250114_dealer_month_details_rpc.sql`
**Status**: Already updated, needs to be applied in Supabase SQL Editor
**Changes**: Fixed total_dealers count to use separate CTE for all assigned dealers (749 instead of 583)

### Migration 2: Fix bar chart RPC
**File**: `supabase/migrations/20250115_fix_dealer_engagement_rpc.sql`
**Status**: Created, needs to be applied in Supabase SQL Editor
**Changes**: Updated `sales_org_dealer_engagement_trailing_v3` to use same logic as drawer

**Apply both migrations in this order:**
1. First: 20250114_dealer_month_details_rpc.sql
2. Second: 20250115_fix_dealer_engagement_rpc.sql

## 2. Drawer Enhancements

### A. Add Sorting Functions

Add after the `getRepInitials` function (around line 256):

```typescript
  const handleSort = (field: 'days_inactive' | 'current_month_revenue' | 'current_month_orders') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
    setPage(0); // Reset to first page when sorting
  };

  const handleDealerNavigation = (customerId: number, repName: string) => {
    const params = new URLSearchParams();
    if (repName && repName !== "Unassigned") {
      params.set("rep", repName);
    }
    params.set("dealer", customerId.toString());
    router.push(`/sales?${params.toString()}`);
  };

  // Sort and paginate reactivated dealers
  const sortedDealers = [...reactivatedDealers].sort((a, b) => {
    const aVal = a[sortField] || 0;
    const bVal = b[sortField] || 0;
    if (sortDirection === 'asc') {
      return aVal > bVal ? 1 : -1;
    }
    return aVal < bVal ? 1 : -1;
  });

  const paginatedDealers = sortedDealers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  // Calculate reactivated dealers revenue stats
  const reactivatedRevenue = reactivatedDealers.reduce((sum, d) => sum + (d.current_month_revenue || 0), 0);
  const reactivatedPct = monthDetails ? ((reactivatedRevenue / monthDetails.total_revenue) * 100) : 0;
```

### B. Update Reactivated Dealers Section

Replace the entire "Reactivated Dealers" section (starts around line 500) with:

```typescript
                    {/* Reactivated Dealers Section */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-foreground flex-[0.7]">
                          Reactivated Dealers ({reactivatedDealers.length})
                        </h3>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 flex-[0.3] ml-auto">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                downloadCSV(
                                  reactivatedDealers,
                                  `reactivated-dealers-${selectedMonth}.csv`,
                                  ["Customer ID", "Dealer Name", "Rep Name", "Last Purchase Date", "Days Inactive", "Reactivation Period", "Current Month Revenue", "Current Month Orders"]
                                )
                              }
                            >
                              <Download className="h-4 w-4 mr-2" />
                              Download CSV
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Narrative Story */}
                      {reactivatedDealers.length > 0 && (
                        <p className="text-sm text-muted-foreground leading-relaxed">
                          <span className="font-semibold">{reactivatedDealers.length}</span> reactivated dealers brought a total revenue of{" "}
                          <span className="font-semibold text-green-600">{fmtUSD0(reactivatedRevenue)}</span>, representing{" "}
                          <span className="font-semibold">{reactivatedPct.toFixed(1)}%</span> of the month's total revenue.
                        </p>
                      )}

                      {reactivatedDealers.length === 0 ? (
                        <p className="text-sm text-muted-foreground">No reactivated dealers for this month</p>
                      ) : (
                        <>
                          {/* Table */}
                          <div className="border rounded-md">
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[200px]">Dealer</TableHead>
                                  <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('days_inactive')}
                                  >
                                    <div className="flex items-center gap-1">
                                      Inactive Period
                                      <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                  </TableHead>
                                  <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('current_month_revenue')}
                                  >
                                    <div className="flex items-center gap-1">
                                      Revenue
                                      <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                  </TableHead>
                                  <TableHead
                                    className="cursor-pointer hover:bg-muted/50"
                                    onClick={() => handleSort('current_month_orders')}
                                  >
                                    <div className="flex items-center gap-1">
                                      Orders
                                      <ArrowUpDown className="h-3 w-3" />
                                    </div>
                                  </TableHead>
                                  <TableHead className="w-[80px]">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {paginatedDealers.map((dealer) => (
                                  <TableRow key={dealer.customer_id}>
                                    <TableCell>
                                      <div className="space-y-1">
                                        <p className="font-medium text-sm">{dealer.dealer_name}</p>
                                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                          <span>{dealer.rep_name}</span>
                                          <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                                            {getRepInitials(dealer.rep_name)}
                                          </span>
                                        </div>
                                      </div>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm font-medium">{dealer.reactivation_period}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm font-medium">{fmtUSD0(dealer.current_month_revenue)}</span>
                                    </TableCell>
                                    <TableCell>
                                      <span className="text-sm">{dealer.current_month_orders}</span>
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        size="icon"
                                        variant="ghost"
                                        className="h-8 w-8"
                                        onClick={() => handleDealerNavigation(dealer.customer_id, dealer.rep_name)}
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>

                          {/* Pagination */}
                          {reactivatedDealers.length > PAGE_SIZE && (
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>
                                Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, reactivatedDealers.length)} of {reactivatedDealers.length}
                              </span>
                              <div className="flex items-center gap-2">
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                                  disabled={page === 0}
                                  className="h-7 w-7"
                                >
                                  <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span>
                                  Page {page + 1} / {Math.ceil(reactivatedDealers.length / PAGE_SIZE)}
                                </span>
                                <Button
                                  type="button"
                                  size="icon"
                                  variant="outline"
                                  onClick={() => setPage((p) => Math.min(Math.ceil(reactivatedDealers.length / PAGE_SIZE) - 1, p + 1))}
                                  disabled={page >= Math.ceil(reactivatedDealers.length / PAGE_SIZE) - 1}
                                  className="h-7 w-7"
                                >
                                  <ChevronRight className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
```

### C. Update Tooltip

Replace the tooltip section (around line 320) with:

```typescript
                    <Tooltip
                      content={({ active, payload }) => {
                        if (active && payload && payload[0]) {
                          const data = payload[0].payload as DealerActivityData;
                          return (
                            <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-3">
                              <p className="text-xs font-semibold text-gray-900 mb-1">{data.monthLabel}</p>
                              <p className="text-xs text-gray-700">
                                Active: <span className="font-semibold">{data.activeDealerPct}%</span>
                              </p>
                              <p className="text-xs text-gray-500">
                                {data.dealerCount} of {data.totalDealers} dealers
                              </p>
                              <p className="text-xs text-blue-600 mt-2 font-medium">Click bar for details</p>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
```

## 3. Expected Results After Migration

### Bar Chart:
- January 2025: Should show **25.8%** (193/749)
- Matches drawer percentage exactly

### Drawer - January 2025:
- Title: "Dealer Pulse: January 2025"
- Active Dealers: 193
- Assigned Dealers: 749
- Active %: 25.8%
- Inactive Dealers for download: 556 (749 - 193)

### Reactivated Dealers:
- Narrative story showing count, revenue, and percentage of month total
- Sortable table with clickable headers
- 10 results per page pagination
- 3-dot menu for CSV download (70:30 header layout)
- Eye icon navigation to dealer page in Sales section

## 4. Application Order

1. Apply SQL migrations in Supabase SQL Editor (both files)
2. Update dealer-sales-pulse.tsx with the changes above
3. Test the drawer with January 2025 data
4. Verify math: 193 + 556 = 749 ✅

## 5. Files Modified

- `supabase/migrations/20250114_dealer_month_details_rpc.sql` (already updated)
- `supabase/migrations/20250115_fix_dealer_engagement_rpc.sql` (new file created)
- `components/dashboard/dealer-sales-pulse.tsx` (needs manual updates per this guide)
