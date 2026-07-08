import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { getBaseUrl } from "@/lib/site-url";
import { HomeClient, type SalonSettings } from "./HomeClient";

export const dynamic = "force-dynamic";

const OPENING_DAYS = [
  { key: "monday", day: "Monday" },
  { key: "tuesday", day: "Tuesday" },
  { key: "wednesday", day: "Wednesday" },
  { key: "thursday", day: "Thursday" },
  { key: "friday", day: "Friday" },
  { key: "saturday", day: "Saturday" },
  { key: "sunday", day: "Sunday" },
] as const;

function buildOpeningHoursSpecification(settings: SalonSettings) {
  return OPENING_DAYS.filter(({ key }) => settings[`is_open_${key}` as keyof SalonSettings])
    .map(({ key, day }) => {
      const opens = (settings[`opening_time_${key}` as keyof SalonSettings] as string | null) || settings.opening_time;
      const closes = (settings[`closing_time_${key}` as keyof SalonSettings] as string | null) || settings.closing_time;
      return {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: `https://schema.org/${day}`,
        opens: opens?.slice(0, 5),
        closes: closes?.slice(0, 5),
      };
    });
}

export default async function Home() {
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

  const settings = (data ?? null) as SalonSettings | null;

  let jsonLd: Record<string, unknown> | null = null;
  if (settings) {
    const baseUrl = await getBaseUrl();
    jsonLd = {
      "@context": "https://schema.org",
      "@type": "HairSalon",
      name: settings.salon_name,
      url: baseUrl,
      ...(settings.hero_image_url || settings.logo_image_url
        ? { image: settings.hero_image_url || settings.logo_image_url }
        : {}),
      ...(settings.phone ? { telephone: settings.phone } : {}),
      ...(settings.address
        ? { address: { "@type": "PostalAddress", streetAddress: settings.address, addressCountry: "FR" } }
        : {}),
      openingHoursSpecification: buildOpeningHoursSpecification(settings),
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
      <HomeClient initialSettings={settings} />
    </>
  );
}
