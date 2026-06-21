import { createClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { getCurrentSalon } from "@/lib/salon";
import { GalerieClient, type SalonSettings } from "./GalerieClient";

export const dynamic = "force-dynamic";

export default async function GaleriePage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase
    .from("salon_settings")
    .select("*")
    .eq("salon_id", salon.id)
    .maybeSingle();

  const settings = data as SalonSettings | null;
  if (!settings?.gallery_enabled) redirect("/");

  return <GalerieClient settings={settings} />;
}
