import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertEnv, env } from "@/lib/env";
import type { Database } from "@/types/database";

type AdminClient = SupabaseClient<Database>;

let supabaseAdminClient: AdminClient | null = null;

export function getSupabaseAdminClient() {
  if (!env.supabaseServiceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is not configured.");
  }

  if (!supabaseAdminClient) {
    assertEnv();
    supabaseAdminClient = createClient<Database>(
      env.supabaseUrl as string,
      env.supabaseServiceRoleKey as string,
    );
  }

  return supabaseAdminClient;
}
