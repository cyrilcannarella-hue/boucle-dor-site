import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
import { getBaseUrl } from "@/lib/site-url";
import { cityFromAddress } from "@/lib/address";
import { SalonProvider } from "@/components/SalonProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "optional",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "optional",
});

// Codes de vérification Google Search Console, un par salon — jamais partagés
// entre salons (chaque propriétaire garde le contrôle de sa propre indexation).
// Un salon peut avoir plusieurs codes si vérifié depuis plusieurs comptes Google.
const GOOGLE_SITE_VERIFICATION: Record<string, string | string[]> = {
  "boucle-dor": [
    "kyMq4XmmiwcfVGrnFezDzlsdWuL9DH0Z_GSwYHoIdOU",
    "RgbIyo06EZMXplccI5nrS5fimu8qwDtoqA5aDMSyOac",
  ],
  "sagessedautrefoi": "RgbIyo06EZMXplccI5nrS5fimu8qwDtoqA5aDMSyOac",
};

export async function generateMetadata(): Promise<Metadata> {
  let salonName = "Votre salon";
  let iconUrl: string | null = null;
  let description = "Réservation en ligne";
  let imageUrl: string | null = null;
  let city: string | null = null;
  let businessType: string | null = null;
  let salonSlug: string | null = null;
  const baseUrl = await getBaseUrl();

  try {
    const salon = await getCurrentSalon();
    salonSlug = salon.slug;
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name, logo_image_url, salon_subtitle, hero_tagline, apropos_text, hero_image_url, address, business_type")
      .eq("salon_id", salon.id)
      .single();
    if (data?.salon_name) salonName = data.salon_name;
    if (data?.logo_image_url) iconUrl = data.logo_image_url;
    city = cityFromAddress(data?.address);
    businessType = data?.business_type || null;
    const desc = data?.salon_subtitle || data?.hero_tagline || data?.apropos_text;
    if (desc) description = desc.slice(0, 140);
    else if (salonName !== "Votre salon") description = `Réservation en ligne — ${salonName}`;
    imageUrl = data?.hero_image_url || data?.logo_image_url || null;
  } catch {}

  // Complète la description avec la ville si elle n'y figure pas déjà — sans écraser
  // le vrai texte saisi par le salon (sous-titre/tagline/à propos), juste enrichi.
  if (city && !description.toLowerCase().includes(city.toLowerCase())) {
    description = `${description} à ${city}`;
  }

  const businessTypeMentionsCity = !!city && !!businessType && businessType.toLowerCase().includes(city.toLowerCase());
  const titleDefault = businessType
    ? `${salonName} — ${businessType}${city && !businessTypeMentionsCity ? ` à ${city}` : ""}`
    : city
    ? `${salonName} — ${city}`
    : salonName;

  return {
    metadataBase: new URL(baseUrl),
    title: {
      default: titleDefault,
      template: `%s | ${salonName}`,
    },
    description,
    alternates: {
      canonical: "/",
    },
    verification: salonSlug && GOOGLE_SITE_VERIFICATION[salonSlug] ? {
      google: GOOGLE_SITE_VERIFICATION[salonSlug],
    } : undefined,
    openGraph: {
      title: titleDefault,
      description,
      url: "/",
      siteName: salonName,
      locale: "fr_FR",
      type: "website",
      images: imageUrl ? [{ url: imageUrl }] : [],
    },
    icons: iconUrl ? {
      icon: [{ url: iconUrl, type: "image/png" }],
      apple: [{ url: iconUrl, type: "image/png" }],
      shortcut: iconUrl,
    } : { icon: [], apple: [], shortcut: [] },
    appleWebApp: {
      capable: true,
      title: salonName,
      statusBarStyle: "default",
    },
    formatDetection: {
      telephone: false,
    },
  };
}

export async function generateViewport(): Promise<Viewport> {
  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("color_page_bg")
      .eq("salon_id", salon.id)
      .single();
    if (data?.color_page_bg) return { themeColor: data.color_page_bg };
  } catch {}
  return { themeColor: "#ffffff" };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const salon = await getCurrentSalon();

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased scroll-smooth`}
    >
      <body className="min-h-full flex flex-col">
        {salon.status === "suspended" ? (
          <main className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <h1 className="text-xl font-semibold">Service temporairement indisponible</h1>
            <p className="text-sm text-neutral-600">
              L&apos;accès à {salon.name} est suspendu. Merci de contacter l&apos;administrateur.
            </p>
          </main>
        ) : (
          <SalonProvider salon={salon}>{children}</SalonProvider>
        )}
      </body>
    </html>
  );
}
