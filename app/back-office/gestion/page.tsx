import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { GestionClient, type SalonSettings } from "./GestionClient";

export const dynamic = "force-dynamic";

export default async function BackOfficeGestionPage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase
    .from("salon_settings")
    .select("*")
    .eq("salon_id", salon.id)
    .limit(1)
    .maybeSingle();

  return <GestionClient initialSettings={(data ?? null) as SalonSettings | null} />;
}
