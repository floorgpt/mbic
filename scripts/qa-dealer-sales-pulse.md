# QA Test Plan: Dealer Sales Pulse Chart

## Test Scenarios

### (a) DateRange Selector Controlling Chart Data

#### Test 1: "This Year" Selection
- **Expected**: Chart shows Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep (all 2025 months with sales)
- **X-axis should show**: Jan, Feb, Mar, Apr, May, Jun, Jul, Aug, Sep
- **Data verification**:
  - Jan: 13.2% (99 of 749 dealers)
  - Feb: 17.1% (128 of 749 dealers)
  - Mar: 19.2% (144 of 749 dealers)
  - Apr: 21.9% (164 of 749 dealers)
  - May: 23.1% (173 of 749 dealers)
  - Jun: 23.2% (174 of 749 dealers)
  - Jul: 13.5% (101 of 749 dealers)
  - Aug: 6.9% (52 of 749 dealers)
  - Sep: 17.5% (131 of 749 dealers)

#### Test 2: "Aug 1 - Sep 30" Selection
- **Expected**: Chart shows Aug, Sep only
- **X-axis should show**: Aug, Sep
- **Data verification**:
  - Aug: 6.9% (52 of 749 dealers)
  - Sep: 17.5% (131 of 749 dealers)

#### Test 3: "Sep 1 - Sep 30" Selection
- **Expected**: Chart shows Sep only
- **X-axis should show**: Sep
- **Data verification**:
  - Sep: 17.5% (131 of 749 dealers)

#### Test 4: "Jan 1 - Mar 31" Selection
- **Expected**: Chart shows Jan, Feb, Mar only
- **X-axis should show**: Jan, Feb, Mar
- **Data verification**:
  - Jan: 13.2% (99 of 749 dealers)
  - Feb: 17.1% (128 of 749 dealers)
  - Mar: 19.2% (144 of 749 dealers)

### (b) Hover Tooltips Showing Correct Month

#### Test 1: Hover over Jan bar
- **Expected tooltip**:
  - Month: "Jan"
  - Active: "13.2%"
  - Dealers: "99 of 749 dealers"

#### Test 2: Hover over Sep bar
- **Expected tooltip**:
  - Month: "Sep"
  - Active: "17.5%"
  - Dealers: "131 of 749 dealers"

#### Test 3: Hover over any bar
- **Verify**: Tooltip month matches X-axis label below the bar

### (c) Click Selecting Correct Month

#### Test 1: Click on Jan bar
- **Expected**:
  - Bar turns blue (selected color)
  - Bottom text shows: "Selected: January 2025"

#### Test 2: Click on Sep bar
- **Expected**:
  - Bar turns blue (selected color)
  - Bottom text shows: "Selected: September 2025"

#### Test 3: Click on different bars sequentially
- **Expected**: Only the clicked bar is blue, others return to green/amber

## Known Sales Data (from Supabase)
```
Jan 2025: 13.22% active (99 dealers)
Feb 2025: 17.09% active (128 dealers)
Mar 2025: 19.23% active (144 dealers)
Apr 2025: 21.90% active (164 dealers)
May 2025: 23.10% active (173 dealers)
Jun 2025: 23.23% active (174 dealers)
Jul 2025: 13.48% active (101 dealers)
Aug 2025: 6.94% active (52 dealers)
Sep 2025: 17.49% active (131 dealers)
Oct-Dec 2025: 0% activity (should not show)
All of 2024: 0% activity (should not show)
```

## Pass/Fail Criteria

### PASS if:
1. X-axis month labels match actual data months (no off-by-one errors)
2. DateRange selector accurately filters chart data
3. Hover tooltips show correct month and data
4. Click selection highlights correct month and displays correct "Selected" text
5. No December 2024 data appears anywhere
6. Months with 0 sales are not rendered

### FAIL if:
1. Any month label is off by one (e.g., showing "Feb" when data is actually "Jan")
2. DateRange selector doesn't control chart data
3. Tooltips show incorrect month
4. Selected month display is wrong
5. December 2024 appears in any scenario
6. Months with 0 sales are rendered
