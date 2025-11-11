# MBIC Dashboard - Deployment Guide

**Version**: 1.0.0
**Last Updated**: January 11, 2025
**Status**: Ready for production deployment

---

## 🎯 Overview

This guide provides step-by-step instructions for deploying the MBIC Dashboard to production via GitHub and Netlify. The application has been thoroughly tested locally and is in a stable, bug-free state.

---

## ⚡ Quick Start

### For Immediate Deployment

```bash
# 1. Ensure you're in the project directory
cd /Users/jaimacmini/Documents/mbic-poc

# 2. Verify everything is working locally
npm run build

# 3. Commit all changes
git add .
git commit -m "feat: enhance collections with dealer drill-down and pagination"

# 4. Push to GitHub (triggers Netlify deployment)
git push origin main
```

---

## 📋 Pre-Deployment Checklist

### 1. Local Verification

Run these commands to ensure everything is working:

```bash
# Check for TypeScript errors
npm run type-check

# Check for linting issues
npm run lint

# Build the production bundle
npm run build

# Test the production build locally
npm run start
```

**Expected Result**: All commands should complete without errors.

### 2. Environment Variables Check

Verify you have all required environment variables in `.env.local`:

```bash
# Check environment variables are set
cat .env.local | grep -E 'NEXT_PUBLIC_SUPABASE_URL|SUPABASE_SERVICE_ROLE_KEY|OPENAI_API_KEY'
```

**Required Variables**:
- ✅ `NEXT_PUBLIC_SUPABASE_URL`
- ✅ `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- ✅ `SUPABASE_SERVICE_ROLE_KEY`
- ✅ `RETELL_AI_SECRET`
- ✅ `OPENAI_API_KEY`
- ✅ `FORMS_STRICT_CATALOGS=false`

### 3. Test Key Features Locally

Visit http://localhost:3000 and verify:

- [x] Dashboard loads without errors
- [x] Top Collections card shows data (5 collections visible)
- [x] Pagination controls work (Previous/Next buttons)
- [x] Clicking a collection opens the drawer
- [x] Dealer data loads in the drawer
- [x] Top 5 dealers section displays correctly
- [x] Rest of dealers table shows with pagination
- [x] Eye icon appears on hover for dealer cards/rows
- [x] Dealer snapshot modal opens and shows data
- [x] CSV export button works
- [x] No console errors (except expected missing RPC functions)

---

## 🚀 Deployment Steps

### Step 1: Stage Changes

```bash
# Check what will be committed
git status

# Review changes
git diff

# Stage all changes
git add .
```

### Step 2: Commit with Descriptive Message

```bash
git commit -m "feat: enhance collections with dealer drill-down and pagination

- Add dealer drill-down modal with sales rep information
- Implement pagination for Top Collections (5 per page)
- Fix collections data mapping (revenue field)
- Improve drawer UI/UX with proper spacing
- Fix console logging pattern (success vs error)
- Update card description for better UX
- Add CSV export functionality
- Enhance dealer snapshot API with rep lookup

See CHANGELOG-2025-01.md for full details"
```

### Step 3: Push to GitHub

```bash
# Push to main branch (triggers Netlify deployment)
git push origin main
```

**Note**: If this is your first push or you have branch protection, you may need to:
```bash
# Create a feature branch
git checkout -b feature/collections-enhancement

# Push feature branch
git push origin feature/collections-enhancement

# Then create a Pull Request on GitHub
```

### Step 4: Monitor Netlify Deployment

1. **Open Netlify Dashboard**: https://app.netlify.com/
2. **Navigate to**: Sites → cpf-mbic2
3. **Watch**: Deploys tab for build progress
4. **Expected Build Time**: 3-5 minutes

**Build Stages**:
1. ⏳ Initializing build
2. ⏳ Installing dependencies (`npm install`)
3. ⏳ Building application (`npm run build`)
4. ⏳ Deploying to CDN
5. ✅ Published

---

## 🔍 Post-Deployment Verification

### Automated Checks

Once deployed, verify these endpoints:

```bash
# 1. Check main dashboard
curl -I https://cpf-mbic2.netlify.app/

# 2. Check diagnostic endpoint
curl -s https://cpf-mbic2.netlify.app/api/diag?from=2025-01-01&to=2025-10-01 | jq '.summary'

# 3. Check Sales Ops diagnostic
curl -s https://cpf-mbic2.netlify.app/api/diag-salesops?from=2025-01-01&to=2025-10-01 | jq '.summary'

# 4. Check forms diagnostic
curl -s https://cpf-mbic2.netlify.app/api/diag-forms | jq '.summary'
```

### Manual Testing Checklist

Visit https://cpf-mbic2.netlify.app/ and verify:

#### Dashboard Page (`/`)
- [ ] Page loads without errors (check browser console)
- [ ] Gross Revenue KPI shows correct value
- [ ] Monthly Revenue Trend chart renders
- [ ] Top Collections card shows 5 collections
- [ ] Pagination controls visible (if >5 collections total)
- [ ] Page 1 of X indicator shows correctly
- [ ] Card description reads: "Click a collection to drill into dealer performance."

#### Collections Interaction
- [ ] Click "Next" pagination button
- [ ] URL updates with `?collectionsPage=2`
- [ ] Collections 6-10 display
- [ ] Click "Previous" button
- [ ] Returns to page 1
- [ ] Click a collection tile
- [ ] Drawer opens from right side
- [ ] Collection name shows in drawer header
- [ ] Date range displays correctly
- [ ] Total revenue and share percentage visible

#### Drawer Functionality
- [ ] Loading spinner appears briefly
- [ ] Executive summary section displays with insights
- [ ] "Top 5 Dealers" section shows 5 highlighted cards
- [ ] Dealer cards show revenue, buying power, preferred color, margin
- [ ] Hover over dealer card shows Eye icon
- [ ] Click Eye icon opens dealer snapshot modal
- [ ] "All Other Dealers" table appears (if >5 dealers)
- [ ] Table pagination works (if >5 other dealers)
- [ ] "Export CSV" button is enabled
- [ ] Click "Export CSV" downloads file
- [ ] CSV filename includes collection name and date range

#### Dealer Snapshot Modal
- [ ] Modal opens centered on screen
- [ ] Dealer name displays correctly
- [ ] Sales rep name shows (not "Unknown")
- [ ] Collection revenue displays
- [ ] Total revenue displays
- [ ] Collection share percentage shows
- [ ] Date range matches parent drawer
- [ ] Close button works
- [ ] Click outside modal closes it
- [ ] Return to drawer shows same state

#### Sales-Ops Page (`/sales-ops`)
- [ ] Navigate to Sales Operations page
- [ ] Top Collections card shows same enhanced behavior
- [ ] Drawer functionality identical to Dashboard
- [ ] All features work consistently

#### Console Checks
- [ ] Open browser DevTools → Console
- [ ] No red errors (except expected missing RPC functions)
- [ ] Expected errors (can be ignored):
  ```
  {"at":"mbic-supabase","fn":"sales_org_fill_rate_v1","ok":false,"error":"function public.sales_org_fill_rate_v1(...) does not exist"}
  {"at":"mbic-supabase","fn":"sales_org_gross_profit_v1","ok":false,"error":"function public.sales_org_gross_profit_v1(...) does not exist"}
  ```

---

## 🐛 Troubleshooting

### Build Fails on Netlify

**Symptom**: Build logs show TypeScript or ESLint errors

**Solution**:
```bash
# Run locally first
npm run type-check
npm run lint
npm run build

# Fix any errors, then commit and push again
git add .
git commit -m "fix: resolve build errors"
git push origin main
```

### Collections Not Displaying

**Symptom**: Top Collections card is empty or shows "No collections in this range yet."

**Possible Causes**:
1. Missing Supabase environment variables
2. RPC function `sales_org_top_collections` not created
3. Date range has no data

**Solution**:
```bash
# 1. Check Netlify environment variables
# Visit: https://app.netlify.com/sites/cpf-mbic2/settings/deploys#environment

# 2. Verify RPC function exists
# Run in Supabase SQL Editor:
SELECT proname FROM pg_proc WHERE proname = 'sales_org_top_collections';

# 3. Test with diagnostic endpoint
curl -s "https://cpf-mbic2.netlify.app/api/diag?from=2025-01-01&to=2025-10-01" | jq '.collections'
```

### Drawer Opens But No Dealers

**Symptom**: Click collection opens drawer but shows "No dealer data yet for this collection."

**Possible Causes**:
1. RPC function `sales_ops_collection_dealers_v1` not created
2. Collection has no associated dealers in date range

**Solution**:
```bash
# 1. Check if RPC function exists
# Run in Supabase SQL Editor:
SELECT proname FROM pg_proc WHERE proname = 'sales_ops_collection_dealers_v1';

# 2. If missing, apply migration
# See: docs/apply-collection-dealer-enhancement.md

# 3. Test dealer endpoint directly
curl -s "https://cpf-mbic2.netlify.app/api/collection-dealers?collection=SpiritXL&from=2025-01-01&to=2025-10-01" | jq
```

### Dealer Snapshot Shows "Unknown" Rep

**Symptom**: Modal opens but sales rep shows as "Unknown"

**Possible Causes**:
1. Dealer has no sales in the date range
2. Sales record has null `rep_id`
3. Rep not found in `sales_reps_demo` table

**Solution**:
```bash
# Test dealer snapshot endpoint
curl -s "https://cpf-mbic2.netlify.app/api/dealer-snapshot?dealerId=123&collection=SpiritXL&from=2025-01-01&to=2025-10-01" | jq

# Check response includes rep_name
# If "Unknown", verify dealer has sales and rep assignment
```

### Pagination Not Working

**Symptom**: Click Next/Previous but collections don't change

**Possible Causes**:
1. JavaScript error preventing navigation
2. URL not updating
3. Data not re-fetching on page change

**Solution**:
1. Check browser console for errors
2. Verify URL updates with `?collectionsPage=2`
3. Check Network tab for new page request
4. If issue persists, check server logs in Netlify → Functions

---

## 🔄 Rollback Procedure

If deployment causes issues, rollback to previous version:

### Option 1: Netlify Dashboard (Fastest)

1. Visit https://app.netlify.com/sites/cpf-mbic2/deploys
2. Find the last working deployment
3. Click on it → Click "Publish deploy"
4. Confirm rollback

### Option 2: Git Revert

```bash
# Find the last working commit
git log --oneline

# Revert to previous commit
git revert HEAD

# Or reset to specific commit (destructive)
git reset --hard <commit-hash>
git push origin main --force
```

---

## 📊 Monitoring

### Key Metrics to Watch

**First 24 Hours**:
- [ ] Page load time (<3s)
- [ ] Error rate (<1%)
- [ ] API response time (<500ms)
- [ ] Netlify bandwidth usage

**First Week**:
- [ ] User feedback on new features
- [ ] Console error patterns
- [ ] CSV export usage
- [ ] Drawer interaction rate

### Logging

**Server Logs** (Netlify Functions):
```bash
# View function logs
netlify logs:function --name=collection-dealers

# Or visit Netlify Dashboard → Functions → View logs
```

**Client Logs** (Browser Console):
- Expected success logs: `{"at":"mbic-supabase","fn":"sales_org_top_collections","ok":true,"error":null}`
- Expected error logs: Missing RPC functions (gracefully handled)

---

## 🎓 Training Users

### Key Messages for End Users

**New Features**:
1. **Collections Pagination**: Navigate through all collections 5 at a time
2. **Dealer Drill-Down**: Click collections to see which dealers are buying
3. **Dealer Insights**: Hover and click Eye icon to see dealer details
4. **CSV Export**: Download dealer data for offline analysis

**Usage Tips**:
- Collections are sorted by revenue (highest first)
- Top 5 dealers contribute ~80% of revenue (80/20 principle)
- Preferred color shows most purchased color by top dealers
- CSV export includes all dealers (not just visible ones)

---

## 📞 Support

### For Technical Issues

**Check These First**:
1. [CHANGELOG-2025-01.md](CHANGELOG-2025-01.md) - Recent changes
2. [README.md](README.md) - General documentation
3. [Troubleshooting](#troubleshooting) - Common issues

**Contact**:
- **Netlify Status**: https://www.netlifystatus.com/
- **Supabase Status**: https://status.supabase.com/

### For Feature Requests

Document requests in:
- GitHub Issues (if repository has issues enabled)
- Project documentation under "Future Enhancements"

---

## ✅ Sign-Off Checklist

Before marking deployment complete:

- [ ] All pre-deployment checks passed
- [ ] Git commit pushed successfully
- [ ] Netlify build completed successfully
- [ ] Post-deployment verification completed
- [ ] Manual testing checklist completed
- [ ] No critical errors in console
- [ ] Performance metrics acceptable
- [ ] Stakeholders notified
- [ ] Documentation updated
- [ ] Monitoring set up

---

## 📚 Related Documentation

- [CHANGELOG-2025-01.md](CHANGELOG-2025-01.md) - Detailed changes
- [README.md](README.md) - Project overview
- [SALES-OPS-MIGRATION-README.md](SALES-OPS-MIGRATION-README.md) - Sales Ops setup
- [docs/mbic-supabase-integration.md](docs/mbic-supabase-integration.md) - Data integration
- [docs/sales-ops-migration-guide.md](docs/sales-ops-migration-guide.md) - Migration guide

---

*Last Updated: January 11, 2025*
*Version: 1.0.0*
*Status: Ready for Production Deployment* ✅
