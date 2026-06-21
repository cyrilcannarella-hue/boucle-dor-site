import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { LoginClient, type SalonSettings } from "./LoginClient";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase
    .from("salon_settings")
    .select("id,color_page_bg,color_header_bg,color_text_main,color_card_border,color_accents,color_nav_text,color_contact_bg,color_hero_bg,site_font,font_salon_name,bg_pattern")
    .eq("salon_id", salon.id)
    .maybeSingle();

  return <LoginClient initialSettings={(data ?? null) as SalonSettings | null} />;
}
