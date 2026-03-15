import { createClient } from "@supabase/supabase-js";
import { getServerEnv } from "@/lib/env";

export function createAdminClient() {
  const env = getServerEnv();
  const apiKey = env.supabaseServiceRoleKey || env.supabasePublishableKey;

  return createClient(env.supabaseUrl, apiKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
}
