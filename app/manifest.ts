import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let salonName = "Votre salon";
  let bgColor = "#ffffff";
  let logoUrl: string | null = null;

  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, color_page_bg, logo_image_url")
      .eq("salon_id", salon.id)
      .single();
    if (data?.salon_name) salonName = data.salon_name;
    if (data?.color_page_bg) bgColor = data.color_page_bg;
    if (data?.logo_image_url) logoUrl = data.logo_image_url;
  } catch {}

  return {
    name: salonName,
    short_name: salonName,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: bgColor,
    theme_color: bgColor,
    orientation: "portrait",
    icons: logoUrl ? [
      { src: logoUrl, sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: logoUrl, sizes: "512x512", type: "image/png", purpose: "maskable" },
    ] : [],
  };
}
