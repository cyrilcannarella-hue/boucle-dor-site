import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { getBaseUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = await getBaseUrl();

  const entries: MetadataRoute.Sitemap = [
    { url: `${baseUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${baseUrl}/reservation`, changeFrequency: "weekly", priority: 0.9 },
    { url: `${baseUrl}/politique-de-confidentialite`, changeFrequency: "yearly", priority: 0.3 },
  ];

  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("gallery_enabled")
      .eq("salon_id", salon.id)
      .maybeSingle();
    if (data?.gallery_enabled) {
      entries.push({ url: `${baseUrl}/galerie`, changeFrequency: "monthly", priority: 0.6 });
    }
  } catch {}

  return entries;
}
