import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  let salonName = "Boucle d'Or";
  let bgColor = "#F5E9DC";

  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, color_page_bg")
      .single();
    if (data?.salon_name) salonName = data.salon_name;
    if (data?.color_page_bg) bgColor = data.color_page_bg;
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
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
