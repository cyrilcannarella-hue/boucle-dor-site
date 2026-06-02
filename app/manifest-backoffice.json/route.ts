import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const revalidate = 3600;

export async function GET() {
  let salonName = "Boucle d'Or";
  let bgColor = "#F5EBDD";

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
      icons: [
        {
          src: "/icon-pro-192.png?v=3",
          sizes: "192x192",
          type: "image/png",
        },
        {
          src: "/icon-pro-512.png?v=3",
          sizes: "512x512",
          type: "image/png",
        },
      ],
    },
    { headers: { "Content-Type": "application/manifest+json" } }
  );
}
