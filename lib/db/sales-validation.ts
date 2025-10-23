import { calculateGrandTotal, groupByMonth } from "@/lib/db/sales";
import type { SalesRow } from "@/types/sales";

const EXPECTED_GRAND_TOTAL = 358192.14;
const EXPECTED_MONTHLY: Record<string, { total: number; rows: number }> = {
  "2025-01": { total: 25684.4, rows: 32 },
  "2025-02": { total: 36590.95, rows: 16 },
  "2025-03": { total: 20389.49, rows: 16 },
  "2025-04": { total: 70187.36, rows: 49 },
  "2025-05": { total: 39353.53, rows: 31 },
  "2025-06": { total: 40117.62, rows: 31 },
  "2025-07": { total: 28728.78, rows: 11 },
  "2025-08": { total: 30066.45, rows: 9 },
  "2025-09": { total: 67073.56, rows: 22 },
};

export function validateLindaFlooring(rows: SalesRow[]) {
  const grand = calculateGrandTotal(rows);
  const issues: string[] = [];
  if (grand !== EXPECTED_GRAND_TOTAL) {
    issues.push(
      `Grand total mismatch for Linda Flooring: expected ${EXPECTED_GRAND_TOTAL}, received ${grand}`,
    );
  }

  const monthly = groupByMonth(rows);
  const monthlyMap = new Map(monthly.map((entry) => [entry.month, entry]));

  for (const [month, expected] of Object.entries(EXPECTED_MONTHLY)) {
    const actual = monthlyMap.get(month);
    if (!actual) {
      issues.push(`Missing monthly data for ${month}`);
      continue;
    }
    if (actual.total !== expected.total) {
      issues.push(
        `Total mismatch for ${month}: expected ${expected.total}, received ${actual.total}`,
      );
    }
    if (actual.rows !== expected.rows) {
      issues.push(
        `Row count mismatch for ${month}: expected ${expected.rows}, received ${actual.rows}`,
      );
    }
  }

  if (issues.length > 0) {
    const message = issues.join("; ");
    if (process.env.NODE_ENV !== "production") {
      throw new Error(message);
    }
    console.warn("MBIC Sales validation warning:", message);
  }

  return {
    grand,
    monthly,
    issues,
  };
}
