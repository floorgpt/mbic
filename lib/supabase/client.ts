import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { assertEnv, env } from "@/lib/env";
import type { Database } from "@/types/database";

let supabaseBrowserClient: SupabaseClient<Database> | null = null;

export function getSupabaseClient() {
  if (!supabaseBrowserClient) {
    assertEnv();
    supabaseBrowserClient = createClient<Database>(
      env.supabaseUrl as string,
      env.supabaseAnonKey as string,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
        },
      },
    );
  }

  return supabaseBrowserClient;
}
