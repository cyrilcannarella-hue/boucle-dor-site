import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { BackOfficeClientsPageClient, type SalonSettings } from "./BackOfficeClientsPageClient";

export const dynamic = "force-dynamic";

export default async function BackOfficeClientsPage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase
    .from("salon_settings")
    .select("id, salon_name, logo_pro_image_url, color_page_bg, color_header_bg, color_text_main, color_salon_name, color_card_border, color_accents, color_nav_text, site_font, font_salon_name, bg_pattern")
    .eq("salon_id", salon.id)
    .limit(1)
    .maybeSingle();

  return <BackOfficeClientsPageClient initialSettings={(data ?? null) as SalonSettings | null} />;
}
