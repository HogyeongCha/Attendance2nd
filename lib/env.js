export function getServerEnv() {
  const env = {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    appSessionSecret: process.env.APP_SESSION_SECRET,
    adminPassword: process.env.ADMIN_PASSWORD,
    eventCenterLat: Number(process.env.NEXT_PUBLIC_EVENT_CENTER_LAT ?? "37.556318"),
    eventCenterLng: Number(process.env.NEXT_PUBLIC_EVENT_CENTER_LNG ?? "127.045965"),
    eventRadiusMeters: Number(process.env.NEXT_PUBLIC_EVENT_RADIUS_METERS ?? "50")
  };

  const missing = [];

  if (!env.supabaseUrl) missing.push("SUPABASE_URL");
  if (!env.supabaseServiceRoleKey) missing.push("SUPABASE_SERVICE_ROLE_KEY");
  if (!env.appSessionSecret) missing.push("APP_SESSION_SECRET");
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(", ")}`);
  }

  return env;
}
