import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { CustomersDemoRow } from "@/types/database";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET all customers or search
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search");
    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("customers_demo")
      .select("*")
      .order("dealer_name", { ascending: true });

    if (search) {
      query = query.ilike("dealer_name", `%${search}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[sales-hub/customers] GET error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error("[sales-hub/customers] Unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Create new customer
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      dealer_name,
      rep_id,
      dealer_billing_address_city,
      dealer_billing_address_state,
      dealer_billing_address_postal_code,
      dealer_billing_address_postal_country,
      dealer_email_1,
    } = body;

    if (!dealer_name || typeof dealer_name !== "string" || dealer_name.trim() === "") {
      return NextResponse.json(
        { error: "dealer_name is required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Prepare insert data
    const insertData: Partial<CustomersDemoRow> = {
      dealer_name: dealer_name.trim(),
    };

    if (rep_id) insertData.rep_id = rep_id;
    if (dealer_billing_address_city) insertData.dealer_billing_address_city = dealer_billing_address_city.trim();
    if (dealer_billing_address_state) insertData.dealer_billing_address_state = dealer_billing_address_state.trim();
    if (dealer_billing_address_postal_code) insertData.dealer_billing_address_postal_code = dealer_billing_address_postal_code.trim();
    if (dealer_billing_address_postal_country) insertData.dealer_billing_address_postal_country = dealer_billing_address_postal_country.trim();
    if (dealer_email_1) insertData.dealer_email_1 = dealer_email_1.trim();

    // Insert new customer
    const { data, error } = await supabase
      .from("customers_demo")
      .insert(insertData as never)
      .select()
      .single();

    if (error) {
      console.error("[sales-hub/customers] POST error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("[sales-hub/customers] POST unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PATCH - Update customer
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      customer_id,
      dealer_name,
      rep_id,
      dealer_billing_address_city,
      dealer_billing_address_state,
      dealer_billing_address_postal_code,
      dealer_billing_address_postal_country,
      dealer_email_1,
    } = body;

    if (!customer_id || !dealer_name || typeof dealer_name !== "string" || dealer_name.trim() === "") {
      return NextResponse.json(
        { error: "customer_id and dealer_name are required" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Get current customer to check if rep_id changed
    const { data: currentCustomer, error: fetchError } = await supabase
      .from("customers_demo")
      .select("rep_id")
      .eq("customer_id", customer_id)
      .single();

    if (fetchError) {
      console.error("[sales-hub/customers] Fetch error:", fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    const currentRepId = (currentCustomer as { rep_id: number | null } | null)?.rep_id;

    // Prepare update data
    const updateData: Partial<CustomersDemoRow> = {
      dealer_name: dealer_name.trim(),
    };

    updateData.rep_id = rep_id || null;
    updateData.dealer_billing_address_city = dealer_billing_address_city?.trim() || null;
    updateData.dealer_billing_address_state = dealer_billing_address_state?.trim() || null;
    updateData.dealer_billing_address_postal_code = dealer_billing_address_postal_code?.trim() || null;
    updateData.dealer_billing_address_postal_country = dealer_billing_address_postal_country?.trim() || null;
    updateData.dealer_email_1 = dealer_email_1?.trim() || null;

    const { data, error } = await supabase
      .from("customers_demo")
      .update(updateData as never)
      .eq("customer_id", customer_id)
      .select()
      .single();

    if (error) {
      console.error("[sales-hub/customers] PATCH error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // If rep_id changed, log the transfer
    if (currentRepId !== rep_id) {
      await supabase.from("customer_rep_transfers").insert({
        customer_id,
        from_rep_id: currentRepId,
        to_rep_id: rep_id,
        transferred_at: new Date().toISOString(),
      } as never);
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error("[sales-hub/customers] PATCH unexpected error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
