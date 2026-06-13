import { createClient } from "@supabase/supabase-js";

// Client service_role : bypass RLS, réservé aux pages /admin (plateforme SaaS).
export function createAdminSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Configuration Supabase (service role) manquante");
  return createClient(url, key);
}
