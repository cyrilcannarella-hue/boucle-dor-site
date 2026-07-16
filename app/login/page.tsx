import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { LoginClient, type SalonSettings } from "./LoginClient";

export const dynamic = "force-dynamic";

// /login est la porte d'entrée du back-office (pas du site public) — si la session a
// expiré, un "Ajouter à l'écran d'accueil" fait depuis cette page doit conserver
// l'identité "Pro" (manifest/icône/titre), sinon iOS capture l'identité du site public.
export async function generateMetadata(): Promise<Metadata> {
  let salonName = "Votre salon";
  let iconUrl: string | null = null;

  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, logo_pro_image_url")
      .eq("salon_id", salon.id)
      .single();
    if (data?.salon_name) salonName = data.salon_name;
    if (data?.logo_pro_image_url) iconUrl = data.logo_pro_image_url;
  } catch {}

  return {
    title: `${salonName} Pro`,
    manifest: "/manifest-backoffice.json",
    icons: iconUrl ? { icon: iconUrl, apple: iconUrl } : { icon: [], apple: [] },
    appleWebApp: {
      capable: true,
      title: `${salonName} Pro`,
      statusBarStyle: "default",
    },
  };
}

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
