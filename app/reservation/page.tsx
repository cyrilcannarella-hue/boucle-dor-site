import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getCurrentSalon } from "@/lib/salon";
import { cityFromAddress } from "@/lib/address";
import { ReservationClient, type SalonSettings } from "./ReservationClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let salonName = "";
  let city: string | null = null;
  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, address")
      .eq("salon_id", salon.id)
      .maybeSingle();
    salonName = data?.salon_name || "";
    city = cityFromAddress(data?.address);
  } catch {}

  return {
    title: city ? `Prendre rendez-vous à ${city}` : "Prendre rendez-vous",
    description: `Réservez votre rendez-vous en ligne${salonName ? ` chez ${salonName}` : ""}${city ? ` à ${city}` : ""}, 24h/24.`,
    alternates: { canonical: "/reservation" },
  };
}

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
