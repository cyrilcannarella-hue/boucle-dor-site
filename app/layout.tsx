import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";
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

export async function generateMetadata(): Promise<Metadata> {
  let salonName = "Votre salon";
  try {
    const salon = await getCurrentSalon();
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    );
    const { data } = await supabase
      .from("salon_settings")
      .select("salon_name")
      .eq("salon_id", salon.id)
      .single();
    if (data?.salon_name) salonName = data.salon_name;
  } catch {}

  return {
    title: salonName,
    description: `Réservation en ligne — ${salonName}`,
    icons: {
      icon: [
        { url: "/icon.png", sizes: "192x192", type: "image/png" },
        { url: "/icon.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
      ],
      shortcut: "/icon.png",
    },
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

export const viewport: Viewport = {
  themeColor: "#F5E9DC",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const salon = await getCurrentSalon();

  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
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
