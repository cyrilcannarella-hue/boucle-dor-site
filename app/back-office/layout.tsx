import type { Metadata, Viewport } from "next";
import { createClient } from "@supabase/supabase-js";

async function getSettings() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, color_page_bg")
      .single();
    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata(): Promise<Metadata> {
  const data = await getSettings();
  const salonName = data?.salon_name || "Boucle d'Or";
  return {
    title: `${salonName} Pro`,
    manifest: "/manifest-backoffice.json",
    icons: {
      icon: "/icon-pro-192.png?v=2",
      apple: "/icon-pro-192.png?v=2",
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  const data = await getSettings();
  return { themeColor: data?.color_page_bg || "#F5EBDD" };
}

export default function BackOfficeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="overflow-x-hidden">{children}</div>;
}
