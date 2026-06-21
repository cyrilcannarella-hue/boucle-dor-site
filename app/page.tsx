import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { HomeClient, type SalonSettings } from "./HomeClient";

export const dynamic = "force-dynamic";

export default async function Home() {
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

  return <HomeClient initialSettings={(data ?? null) as SalonSettings | null} />;
}
