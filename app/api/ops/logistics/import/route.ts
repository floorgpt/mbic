import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ParsedRow = {
  month: number;
  year: number;
  sales: number;
  costs: number;
  gross_margin_pct: number;
  inventory_turnover: number;
  avg_delivery_days: number;
  delivered_orders: number;
  in_progress_orders: number;
  not_delivered_orders: number;
  order_accuracy_pct: number;
};

type ValidationError = {
  row: number;
  field: string;
  value: string;
  message: string;
};

function parseCSV(csvData: string): { headers: string[]; rows: string[][] } {
  const lines = csvData.trim().split(/\r?\n/);

  if (lines.length === 0) {
    throw new Error("CSV file is empty");
  }

  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = lines.slice(1).map((line) => line.split(",").map((v) => v.trim()));

  return { headers, rows };
}

function validateHeaders(headers: string[]): string[] {
  const requiredHeaders = [
    "Month",
    "Year",
    "Sales",
    "Costs",
    "Gross Margin %",
    "Inventory Turnover",
    "Avg Delivery Days",
    "Delivered Orders",
    "In Progress Orders",
    "Not Delivered Orders",
    "Order Accuracy %",
  ];

  const missing = requiredHeaders.filter((rh) => !headers.includes(rh));

  if (missing.length > 0) {
    throw new Error(`Missing required columns: ${missing.join(", ")}`);
  }

  return headers;
}

function parseNumber(value: string, fieldName: string, rowIndex: number): number {
  const num = Number(value);
  if (Number.isNaN(num)) {
    throw new Error(`Row ${rowIndex}: "${fieldName}" must be a valid number (got "${value}")`);
  }
  return num;
}

function validateAndParseRow(
  row: string[],
  headers: string[],
  rowIndex: number,
): ParsedRow {
  const errors: ValidationError[] = [];

  // Map row values to headers
  const rowData: Record<string, string> = {};
  headers.forEach((header, i) => {
    rowData[header] = row[i] || "";
  });

  // Parse and validate each field
  try {
    const month = parseNumber(rowData["Month"], "Month", rowIndex);
    const year = parseNumber(rowData["Year"], "Year", rowIndex);
    const sales = parseNumber(rowData["Sales"], "Sales", rowIndex);
    const costs = parseNumber(rowData["Costs"], "Costs", rowIndex);
    const gross_margin_pct = parseNumber(rowData["Gross Margin %"], "Gross Margin %", rowIndex);
    const inventory_turnover = parseNumber(rowData["Inventory Turnover"], "Inventory Turnover", rowIndex);
    const avg_delivery_days = parseNumber(rowData["Avg Delivery Days"], "Avg Delivery Days", rowIndex);
    const delivered_orders = parseNumber(rowData["Delivered Orders"], "Delivered Orders", rowIndex);
    const in_progress_orders = parseNumber(rowData["In Progress Orders"], "In Progress Orders", rowIndex);
    const not_delivered_orders = parseNumber(rowData["Not Delivered Orders"], "Not Delivered Orders", rowIndex);
    const order_accuracy_pct = parseNumber(rowData["Order Accuracy %"], "Order Accuracy %", rowIndex);

    // Validate ranges
    if (month < 1 || month > 12) {
      errors.push({
        row: rowIndex,
        field: "Month",
        value: String(month),
        message: "Month must be between 1 and 12",
      });
    }

    if (year < 2000 || year > 2100) {
      errors.push({
        row: rowIndex,
        field: "Year",
        value: String(year),
        message: "Year must be between 2000 and 2100",
      });
    }

    if (sales < 0) {
      errors.push({
        row: rowIndex,
        field: "Sales",
        value: String(sales),
        message: "Sales cannot be negative",
      });
    }

    if (costs < 0) {
      errors.push({
        row: rowIndex,
        field: "Costs",
        value: String(costs),
        message: "Costs cannot be negative",
      });
    }

    if (gross_margin_pct < 0 || gross_margin_pct > 100) {
      errors.push({
        row: rowIndex,
        field: "Gross Margin %",
        value: String(gross_margin_pct),
        message: "Gross Margin % must be between 0 and 100",
      });
    }

    if (inventory_turnover < 0) {
      errors.push({
        row: rowIndex,
        field: "Inventory Turnover",
        value: String(inventory_turnover),
        message: "Inventory Turnover cannot be negative",
      });
    }

    if (avg_delivery_days < 0) {
      errors.push({
        row: rowIndex,
        field: "Avg Delivery Days",
        value: String(avg_delivery_days),
        message: "Avg Delivery Days cannot be negative",
      });
    }

    if (delivered_orders < 0 || in_progress_orders < 0 || not_delivered_orders < 0) {
      errors.push({
        row: rowIndex,
        field: "Orders",
        value: "",
        message: "Order counts cannot be negative",
      });
    }

    if (order_accuracy_pct < 0 || order_accuracy_pct > 100) {
      errors.push({
        row: rowIndex,
        field: "Order Accuracy %",
        value: String(order_accuracy_pct),
        message: "Order Accuracy % must be between 0 and 100",
      });
    }

    if (errors.length > 0) {
      const errorMessages = errors.map((e) => `${e.field}: ${e.message}`).join("; ");
      throw new Error(`Row ${rowIndex}: ${errorMessages}`);
    }

    return {
      month,
      year,
      sales,
      costs,
      gross_margin_pct,
      inventory_turnover,
      avg_delivery_days,
      delivered_orders,
      in_progress_orders,
      not_delivered_orders,
      order_accuracy_pct,
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error(`Row ${rowIndex}: Unknown validation error`);
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { csvData } = body;

    if (!csvData || typeof csvData !== "string") {
      return NextResponse.json(
        { ok: false, err: "No CSV data provided" },
        { status: 400 },
      );
    }

    // Parse CSV
    const { headers, rows } = parseCSV(csvData);

    // Validate headers
    validateHeaders(headers);

    // Validate and parse all rows
    const parsedRows: ParsedRow[] = [];
    const seenMonthYear = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      // Skip empty rows
      if (row.every((cell) => !cell || cell.trim() === "")) {
        continue;
      }

      try {
        const parsed = validateAndParseRow(row, headers, i + 2); // +2 because row 1 is header

        // Check for duplicate month/year
        const key = `${parsed.year}-${parsed.month}`;
        if (seenMonthYear.has(key)) {
          throw new Error(`Duplicate entry for ${parsed.month}/${parsed.year}`);
        }
        seenMonthYear.add(key);

        parsedRows.push(parsed);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
          { ok: false, err: message },
          { status: 400 },
        );
      }
    }

    if (parsedRows.length === 0) {
      return NextResponse.json(
        { ok: false, err: "No valid data rows found in CSV" },
        { status: 400 },
      );
    }

    // Import to database
    const supabase = getSupabaseAdminClient();

    // Delete all existing data
    const { error: deleteError } = await supabase
      .from("logistics_kpis")
      .delete()
      .neq("id", 0); // Delete all rows

    if (deleteError) {
      console.error("[ops] import:delete-error", deleteError);
      // Continue anyway - table might not exist yet
    }

    // Insert new data
    const { error: insertError } = await supabase
      .from("logistics_kpis")
      .insert(parsedRows as never[])
      .select();

    if (insertError) {
      console.error("[ops] import:insert-error", insertError);
      return NextResponse.json(
        {
          ok: false,
          err: `Database error: ${insertError.message}. The table may not exist yet. Please ensure the migration has been run.`,
        },
        { status: 500 },
      );
    }

    console.log("[ops] import:success", {
      rowsImported: parsedRows.length,
      dateRange: {
        from: `${Math.min(...parsedRows.map((r) => r.year))}-${Math.min(...parsedRows.filter((r) => r.year === Math.min(...parsedRows.map((r) => r.year))).map((r) => r.month))}`,
        to: `${Math.max(...parsedRows.map((r) => r.year))}-${Math.max(...parsedRows.filter((r) => r.year === Math.max(...parsedRows.map((r) => r.year))).map((r) => r.month))}`,
      },
    });

    return NextResponse.json(
      {
        ok: true,
        data: {
          rowsImported: parsedRows.length,
          message: "Data imported successfully",
        },
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[ops] import:unhandled", message);
    return NextResponse.json(
      { ok: false, err: message },
      { status: 500 },
    );
  }
}
