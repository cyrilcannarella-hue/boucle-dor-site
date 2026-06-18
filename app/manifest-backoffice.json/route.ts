import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";

export const revalidate = 3600;

export async function GET() {
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
      .select("salon_name, color_page_bg, logo_pro_image_url, logo_image_url")
      .eq("salon_id", salon.id)
      .single();
    if (data?.salon_name) salonName = data.salon_name;
    if (data?.color_page_bg) bgColor = data.color_page_bg;
    if (data?.logo_pro_image_url) logoUrl = data.logo_pro_image_url;
    else if (data?.logo_image_url) logoUrl = data.logo_image_url;
  } catch {}

  return NextResponse.json(
    {
      id: "/back-office",
      name: `${salonName} Pro`,
      short_name: "Pro",
      start_url: "/back-office?v=3",
      scope: "/back-office",
      display: "standalone",
      background_color: bgColor,
      theme_color: bgColor,
      icons: logoUrl ? [
        { src: logoUrl, sizes: "192x192", type: "image/png" },
        { src: logoUrl, sizes: "512x512", type: "image/png" },
      ] : [],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
