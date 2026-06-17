import type { Metadata, Viewport } from "next";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";

async function getSettings() {
  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, color_page_bg, logo_pro_image_url")
      .eq("salon_id", salon.id)
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSettings();
  const salonName = data?.salon_name || "Votre salon";
  const iconUrl = data?.logo_pro_image_url || "/icon-pro-192.png";
  return {
    title: `${salonName} Pro`,
    manifest: "/manifest-backoffice.json",
    icons: {
      icon: iconUrl,
      apple: iconUrl,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const data = await getSettings();
  return { themeColor: data?.color_page_bg || "#ffffff" };
}

export default function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="overflow-x-hidden">{children}</div>;
}
