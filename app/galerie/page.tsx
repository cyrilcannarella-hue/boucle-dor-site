import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSalon } from "@/lib/salon";
import { cityFromAddress } from "@/lib/address";
import { GalerieClient, type SalonSettings } from "./GalerieClient";

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
    title: "Galerie photos",
    description: `Découvrez les réalisations${salonName ? ` de ${salonName}` : ""}${city ? ` à ${city}` : ""} en photos.`,
    alternates: { canonical: "/galerie" },
  };
}

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
