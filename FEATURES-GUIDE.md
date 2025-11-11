# MBIC Dashboard - Features Guide

**Version**: 1.0.0
**Last Updated**: January 11, 2025

---

## 📚 Table of Contents

1. [Top Collections Enhancement](#top-collections-enhancement)
2. [Dealer Drill-Down](#dealer-drill-down)
3. [Dealer Snapshot Modal](#dealer-snapshot-modal)
4. [CSV Export](#csv-export)
5. [Pagination](#pagination)
6. [Technical Features](#technical-features)

---

## 🎯 Top Collections Enhancement

### Overview
The Top Collections card has been significantly enhanced with dealer insights, pagination, and improved visual design.

### Location
- **Dashboard**: Main page (`/`)
- **Sales Operations**: Sales-Ops page (`/sales-ops`)

### Key Features

#### Visual Design
- Clean card layout with proper spacing
- Hover effects on collection tiles
- Clear visual hierarchy
- Responsive design for mobile and desktop

#### Card Description
New user-friendly description guides users:
> "Click a collection to drill into dealer performance."

#### Collection Tiles
Each collection displays:
- **Collection Name**: Product collection identifier
- **Revenue**: Lifetime or period-specific revenue
- **Share**: Percentage of total revenue

#### Pagination Controls
When more than 5 collections exist:
- Previous button (disabled on first page)
- Page indicator: "Page X of Y"
- Next button (disabled on last page)
- URL updates with page parameter

### Usage

1. **Browse Collections**
   - View top 5 collections on page 1
   - Click "Next" to see collections 6-10
   - Continue navigating through all collections

2. **Select Collection**
   - Click any collection tile
   - Drawer slides in from right
   - View dealer performance details

3. **Navigate Pages**
   - Use Previous/Next buttons
   - URL updates: `?collectionsPage=2`
   - Bookmark specific pages

---

## 🔍 Dealer Drill-Down

### Overview
Click any collection to see which dealers are purchasing from that collection, with detailed performance metrics.

### Drawer Layout

#### Header Section
- Collection name
- Date range context
- Total revenue and share percentage

#### Executive Summary
Insight-driven summary showing:
- Total active dealers
- Top 5 dealers' purchase volume (percentage)
- Most preferred color among top dealers

Example:
> "From your **127** active dealers, **78%** of purchase volume goes to your **top 5 dealers**, and **Titanium** is the preferred choice."

#### Top 5 Dealers Section
Special highlight section showing:
- Rank badge (1-5)
- Dealer name with Eye icon on hover
- Revenue (period-specific)
- Buying Power percentage
- Preferred Color
- Gross Margin percentage

**80/20 Principle**: These 5 dealers typically represent ~80% of collection revenue.

#### All Other Dealers Section
Paginated table showing remaining dealers:
- Dealer name
- Revenue
- Buying Power
- Preferred Color
- Gross Margin
- Eye icon on hover

### Metrics Explained

**Revenue**
- Total dollar amount purchased from this collection
- Calculated for selected date range
- Formatted as USD (e.g., $123,456)

**Buying Power %**
- Dealer's share of total collection revenue
- Shows relative importance of each dealer
- Higher percentage = larger customer

**Preferred Color**
- Most frequently purchased color by this dealer
- Helps identify preferences and trends
- Useful for inventory planning

**Gross Margin %**
- Profitability metric
- (Revenue - COGS) / Revenue
- Higher = more profitable sales

### Actions Available

1. **View Dealer Details**: Click Eye icon for snapshot modal
2. **Export Data**: Download CSV with all dealers
3. **Navigate Dealers**: Use pagination for long lists
4. **Close Drawer**: Click X or outside drawer

---

## 👤 Dealer Snapshot Modal

### Overview
Quick-view modal providing dealer summary without leaving the current page.

### When to Use
- Quick dealer reference
- Verify sales rep assignment
- Check collection focus
- Assess dealer importance

### Modal Content

#### Dealer Information
- Dealer ID
- Dealer Name
- Sales Rep assigned

#### Performance Metrics
- **Collection Revenue**: How much this dealer spends on selected collection
- **Total Revenue**: Dealer's spend across all collections
- **Collection Share %**: What percentage of dealer's budget goes to this collection

#### Context
- Date range (inherited from parent drawer)
- Collection name (inherited from parent)

### Usage Flow

1. **Open Modal**
   - Hover over dealer card (Top 5 section)
   - OR hover over dealer row (All Other Dealers table)
   - Eye icon appears
   - Click Eye icon

2. **Review Information**
   - Check dealer name and ID
   - Note assigned sales rep
   - Review revenue metrics
   - Understand collection focus

3. **Close Modal**
   - Click X button (top right)
   - Click outside modal (on overlay)
   - Press ESC key

### Use Cases

**Sales Rep Verification**
> "Is this dealer assigned to the correct rep?"

**Collection Focus**
> "Does this dealer primarily buy from this collection or is it a side purchase?"

**Revenue Context**
> "Is this dealer a major client overall or just for this collection?"

**Quick Reference**
> "What's this dealer's ID for CRM lookup?"

---

## 📊 CSV Export

### Overview
Download complete dealer performance data for offline analysis, reporting, or sharing.

### Export Button Location
- Top right of drawer
- Below "Top 5 Dealers" header
- Enabled when dealer data loads successfully
- Disabled during loading or on error

### File Contents

#### Columns Included
1. **Dealer** - Dealer name
2. **Dealer ID** - Unique identifier
3. **Revenue** - Dollar amount
4. **Buying Power %** - Share of collection revenue
5. **Preferred Color** - Most purchased color
6. **Avg Price** - Average price point
7. **Avg COGS** - Average cost of goods sold
8. **Gross Margin %** - Profitability metric
9. **Gross Profit** - Dollar profit amount

#### File Naming
Format: `{collection-name}-dealers-{from}-to-{to}.csv`

Example: `spiritxl-dealers-2025-01-01-to-2025-10-01.csv`

### Usage

1. **Open Drawer**
   - Click collection to view dealers
   - Wait for dealer data to load

2. **Export Data**
   - Click "Export CSV" button
   - File downloads automatically
   - Browser saves to Downloads folder

3. **Use Downloaded File**
   - Open in Excel, Google Sheets, or Numbers
   - Filter and sort as needed
   - Create pivot tables
   - Share with team members

### Use Cases

**Sales Analysis**
- Identify high-value dealers
- Compare buying power across dealers
- Analyze margin opportunities

**Territory Planning**
- Assign dealers to reps
- Balance territory workload
- Identify growth opportunities

**Reporting**
- Executive summaries
- Board presentations
- Sales team meetings

**Forecasting**
- Predict future demand
- Plan inventory levels
- Budget planning

---

## 📄 Pagination

### Overview
Navigate through large lists efficiently with page-based navigation.

### Two Pagination Systems

#### 1. Collections Card Pagination
**Location**: Top Collections card footer
**Purpose**: Browse all collections 5 at a time
**Controls**:
- Previous button (← Previous)
- Page indicator (Page X of Y)
- Next button (Next →)

**Behavior**:
- Shows 5 collections per page
- URL updates: `?collectionsPage=2`
- Maintains date range parameters
- Disabled buttons show visual feedback
- Active page number displayed

#### 2. Drawer Pagination
**Location**: "All Other Dealers" section in drawer
**Purpose**: Navigate dealers beyond top 5
**Controls**:
- ChevronLeft button (←)
- Page indicator (Page X of Y)
- ChevronRight button (→)

**Behavior**:
- Shows 5 dealers per page
- Client-side only (no URL change)
- Resets to page 1 when changing collections
- Smooth transitions

### User Experience

#### Loading States
- Spinner appears during data fetch
- Pagination hidden until data loads
- Clear loading message

#### Empty States
- "No collections in this range yet."
- "No dealer data yet for this collection."
- Helpful context about date range

#### Error States
- Red error banner with message
- Pagination disabled
- Retry guidance

### Accessibility

- Keyboard navigation supported
- ARIA labels on buttons
- Focus indicators visible
- Screen reader friendly

---

## 🔧 Technical Features

### Performance Optimizations

#### Lazy Loading
- Dealer data fetches only when drawer opens
- Prevents unnecessary API calls
- Faster initial page load

#### Request Cancellation
- AbortController cancels pending requests
- Prevents race conditions
- Cleans up on drawer close

#### Memoization
- Export function memoized with useCallback
- Prevents unnecessary re-renders
- Optimized event handlers

### Data Management

#### State Management
- React hooks for local state
- URL parameters for shareable state
- No global state needed

#### Error Handling
- Graceful degradation on API failures
- User-friendly error messages
- Fallback UI for missing data

#### Type Safety
- Full TypeScript coverage
- Strict null checks
- Typed API responses

### Browser Compatibility

**Supported Browsers**:
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

**Mobile Support**:
- iOS Safari 14+
- Chrome Android 90+
- Responsive design
- Touch-friendly interactions

### Logging & Debugging

#### Console Logs
Success logs (info level):
```json
{
  "at": "mbic-supabase",
  "fn": "sales_org_top_collections",
  "ok": true,
  "error": null
}
```

Error logs (error level):
```json
{
  "at": "mbic-supabase",
  "fn": "sales_ops_collection_dealers_v1",
  "ok": false,
  "error": "RPC function not found"
}
```

#### Network Monitoring
- API calls visible in DevTools Network tab
- Request/response inspection
- Timing information available

---

## 🎓 Tips & Best Practices

### For End Users

**Collections Navigation**
- Use pagination to explore all collections systematically
- Bookmark pages for quick access to specific ranges
- Sort is automatic (highest revenue first)

**Dealer Analysis**
- Focus on Top 5 dealers first (80/20 rule)
- Use Eye icon for quick context before detailed analysis
- Export CSV for deeper analysis in Excel

**Performance Review**
- Compare buying power across dealers
- Identify margin improvement opportunities
- Track preferred colors for inventory planning

### For Administrators

**Data Quality**
- Ensure Supabase RPC functions are up to date
- Monitor API response times
- Review error logs for patterns

**User Training**
- Show pagination workflow
- Demonstrate CSV export
- Explain dealer snapshot use cases

**Monitoring**
- Watch for slow drawer loads
- Check CSV download success rate
- Monitor modal interaction rate

---

## 🆘 Common Questions

### "Why only 5 collections per page?"

Keeps the card aligned with the Monthly Revenue Trend card on the left. Also improves load time and reduces visual clutter.

### "Can I change the page size?"

Currently fixed at 5. Contact your administrator if you need a different default.

### "What if a dealer has no preferred color?"

System will show the color with the most purchases. If tied, it picks the first alphabetically.

### "Why does the drawer take a moment to load?"

Dealer data is fetched on-demand when you click a collection. This prevents loading all dealer data at page load, which would slow down the dashboard.

### "Can I export dealers from multiple collections at once?"

Not currently. Export each collection separately, then combine in Excel if needed.

### "What does 'Unknown' rep mean in the dealer snapshot?"

The dealer either has no sales in the selected date range or the sales records don't have a sales rep assigned.

### "Why do some collections show 0% share?"

This can happen if the collection has very low revenue compared to others, or if there's a calculation issue. Check the actual revenue amount.

---

## 📞 Support

### For Feature Questions
- Review this guide thoroughly
- Check [CHANGELOG-2025-01.md](CHANGELOG-2025-01.md) for recent changes
- Consult [README.md](README.md) for general documentation

### For Technical Issues
- Check browser console for errors
- Verify Supabase connection
- Review [DEPLOYMENT-GUIDE.md](DEPLOYMENT-GUIDE.md) troubleshooting section

### For Enhancement Requests
- Document the use case
- Describe expected behavior
- Note any workarounds currently used

---

*Last Updated: January 11, 2025*
*Version: 1.0.0*
*For: MBIC Dashboard Users & Administrators*
