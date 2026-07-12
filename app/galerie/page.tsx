import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentSalon } from "@/lib/salon";
import { cityFromAddress } from "@/lib/address";
import { getBaseUrl } from "@/lib/site-url";
import { GalerieClient, type SalonSettings } from "./GalerieClient";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  let salonName = "";
  let city: string | null = null;
  let galleryText = "";
  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, address, site_gallery")
      .eq("salon_id", salon.id)
      .maybeSingle();
    salonName = data?.salon_name || "";
    city = cityFromAddress(data?.address);
    galleryText = (data?.site_gallery as { text?: string } | null)?.text?.trim() || "";
  } catch {}

  const description =
    galleryText.length > 0
      ? galleryText.slice(0, 160)
      : `Découvrez les réalisations${salonName ? ` de ${salonName}` : ""}${city ? ` à ${city}` : ""} en photos.`;

  return {
    title: "Galerie photos",
    description,
    alternates: { canonical: "/galerie" },
  };
}

export default async function GaleriePage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase
    .from("salon_settings")
    .select("*")
    .eq("salon_id", salon.id)
    .maybeSingle();

  const settings = data as SalonSettings | null;
  if (!settings?.gallery_enabled) redirect("/");

  const images = (settings.site_gallery?.photos || []).map((p) => p.url).filter(Boolean);
  let jsonLd: Record<string, unknown> | null = null;
  if (images.length > 0) {
    const baseUrl = await getBaseUrl();
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "LocalBusiness",
      name: settings.salon_name,
      url: `${baseUrl}/galerie`,
      image: images,
      ...(settings.phone ? { telephone: settings.phone } : {}),
      ...(settings.address
        ? { address: { "@type": "PostalAddress", streetAddress: settings.address, addressCountry: "FR" } }
        : {}),
    };
  }

  return (
    <>
      {jsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      )}
      <GalerieClient settings={settings} />
    </>
  );
}
