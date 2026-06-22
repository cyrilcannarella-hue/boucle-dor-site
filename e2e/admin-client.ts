import "./load-env";
import { createClient } from "@supabase/supabase-js";

export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis (voir .env.local).");
  }
  return createClient(url, key);
}

export async function getSalonTestId(admin: ReturnType<typeof createAdminClient>): Promise<string> {
  const { data, error } = await admin.from("salons").select("id").eq("slug", "salon-test").single();
  if (error || !data) {
    throw new Error(`Salon "salon-test" introuvable : ${error?.message ?? "aucune ligne"}`);
  }
  return data.id;
}
