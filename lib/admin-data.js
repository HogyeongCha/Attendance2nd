import { createAdminClient } from "@/lib/supabase/server";
import { getAdminSession } from "@/lib/session";

export async function requireAdminSession() {
  const session = await getAdminSession();
  return Boolean(session?.role === "admin");
}

export async function getAdminDashboardData() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("app_admin_dashboard");
  if (error) throw error;
  return data;
}
