import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { ReservationClient, type SalonSettings } from "./ReservationClient";

export const dynamic = "force-dynamic";

export default async function ReservationPage() {
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

  return <ReservationClient initialSettings={(data ?? null) as SalonSettings | null} />;
}
