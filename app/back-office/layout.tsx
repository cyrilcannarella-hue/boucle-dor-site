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
  const iconUrl = data?.logo_pro_image_url || null;
  return {
    title: `${salonName} Pro`,
    manifest: "/manifest-backoffice.json",
    icons: iconUrl ? { icon: iconUrl, apple: iconUrl } : { icon: [], apple: [] },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const data = await getSettings();
  return { themeColor: data?.color_page_bg || "#ffffff" };
}

export default async function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const salon = await getCurrentSalon();

  return (
    <div className="overflow-x-hidden">
      {salon.slug === "demo" && (
        <div className="sticky top-0 z-50 bg-amber-400 px-4 py-2 text-center text-sm font-semibold text-amber-950">
          Mode démonstration — vous pouvez naviguer librement, aucune modification n&apos;est enregistrée.
        </div>
      )}
      {children}
    </div>
  );
}
