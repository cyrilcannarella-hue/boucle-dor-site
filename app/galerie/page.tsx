"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { useSalon } from "@/hooks/useSalon";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, getPatternBgLayer } from "@/components/SitePattern";

type SalonSettings = {
  id: string;
  salon_name: string;
  salon_subtitle?: string | null;
  logo_image_url?: string | null;
  color_titles?: string | null;
  color_accents?: string | null;
  color_contact_bg?: string | null;
  color_page_bg?: string | null;
  color_text_main?: string | null;
  color_text_secondary?: string | null;
  color_header_bg?: string | null;
  color_card_border?: string | null;
  color_nav_text?: string | null;
  color_gradient_end?: string | null;
  color_badges?: string | null;
  color_subtitles?: string | null;
  color_hero_bg?: string | null;
  site_font?: string | null;
  font_salon_name?: string | null;
  bg_pattern?: string | null;
  gallery_enabled?: boolean | null;
  site_gallery?: { title: string; text: string; photos: Array<{ url: string; caption: string }> } | null;
};

function derivePanelBg(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  if (luminance > 0.85) return "#ffffff";
  const clamp = (v: number) => Math.min(255, v + 15);
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function blendHex(hex1: string, hex2: string, ratio: number): string {
  const h1 = hex1.replace("#", "");
  const h2 = hex2.replace("#", "");
  const r = Math.round(parseInt(h1.slice(0, 2), 16) * ratio + parseInt(h2.slice(0, 2), 16) * (1 - ratio));
  const g = Math.round(parseInt(h1.slice(2, 4), 16) * ratio + parseInt(h2.slice(2, 4), 16) * (1 - ratio));
  const b = Math.round(parseInt(h1.slice(4, 6), 16) * ratio + parseInt(h2.slice(4, 6), 16) * (1 - ratio));
  return `#${r.toString(16).padStart(2, "0")}${g.toString(16).padStart(2, "0")}${b.toString(16).padStart(2, "0")}`;
}

function darkenHex(hex: string, factor: number): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16) * factor;
  const g = parseInt(h.slice(2, 4), 16) * factor;
  const b = parseInt(h.slice(4, 6), 16) * factor;
  return `#${[r, g, b].map((c) => Math.round(c).toString(16).padStart(2, "0")).join("")}`;
}

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.40 ? "#111827" : "#ffffff";
}

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  return `${parseInt(h.slice(0, 2), 16)},${parseInt(h.slice(2, 4), 16)},${parseInt(h.slice(4, 6), 16)}`;
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: "easeOut" as const } },
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.07 } },
};

export default function GaleriePage() {
  const { id: salonId } = useSalon();
  const router = useRouter();
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [typedText, setTypedText] = useState("");

  useEffect(() => {
    const load = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("salon_settings")
        .select("*")
        .eq("salon_id", salonId)
        .maybeSingle();
      const s = (data ?? null) as SalonSettings | null;
      setSettings(s);
      setLoading(false);
      if (!s?.gallery_enabled) router.replace("/");
    };
    load();
  }, [salonId, router]);

  useEffect(() => {
    const text = settings?.site_gallery?.text || "";
    if (!text) return;
    setTypedText("");
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setTypedText(text.slice(0, i));
      if (i >= text.length) clearInterval(iv);
    }, 18);
    return () => clearInterval(iv);
  }, [settings?.site_gallery?.text]);

  if (loading || !settings?.gallery_enabled) return null;

  const colorTitles = settings.color_titles || "#1a1a2e";
  const colorAccents = settings.color_accents || "#4f46e5";
  const colorContactBg = settings.color_contact_bg || "#111827";
  const colorHeroBg = settings.color_hero_bg || settings.color_contact_bg || "#111827";
  const colorPageBg = settings.color_page_bg || "#ffffff";
  const colorPanelBg = derivePanelBg(colorPageBg);
  const bgPatternLayer = getPatternBgLayer(settings.bg_pattern, colorPageBg);
  const colorTextMain = settings.color_text_main || "#111827";
  const colorTextSecondary = settings.color_text_secondary || "#6b7280";
  const colorHeaderBg = settings.color_header_bg || "#ffffff";
  const colorCardBorder = settings.color_card_border || "#e5e7eb";
  const colorNavText = settings.color_nav_text || "#111827";
  const colorGradientEnd = settings.color_gradient_end || "#4f46e5";
  const colorSubtitles = settings.color_subtitles || colorTextSecondary;
  const colorBadges = settings.color_badges || colorTitles;
  const salonName = settings.salon_name || "Votre salon";
  const logoUrl = settings.logo_image_url || null;
  const gallery = settings.site_gallery;
  const photos = (gallery?.photos ?? []).filter((p) => p.url);

  const cssVars = `
    :root {
      --gold: ${colorTitles};
      --gold-light: ${colorAccents};
      --gradient-end: ${colorGradientEnd};
      --nav-text: ${colorNavText};
      --text-main: ${colorTextMain};
      --text-secondary: ${colorTextSecondary};
      --page-bg: ${colorPageBg};
      --panel-bg: ${colorPanelBg};
      --card-border: ${colorCardBorder};
      --header-bg: ${colorHeaderBg};
      --accents: ${colorAccents};
      --contact-bg: ${colorContactBg};
      --hero-edge: ${contrastText(colorHeroBg)}1a;
      --font-salon-name: '${settings.font_salon_name ?? ""}', sans-serif;
    }
  `;

  return (
    <main
      className="relative min-h-screen overflow-hidden scroll-smooth"
      style={{
        background: `${bgPatternLayer ? bgPatternLayer + "," : ""}radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.24), transparent 34%), ${colorPageBg}`,
        color: colorTextMain,
      }}
    >
      <style>{cssVars}</style>
      <SiteFont font={settings.site_font} salonNameFont={settings.font_salon_name} />
      <SitePattern pattern={settings.bg_pattern} />

      {/* Header */}
      <header
        className="sticky top-0 z-50 shadow-[0_14px_45px_rgba(80,55,25,0.10)] backdrop-blur-md"
        style={{ borderBottom: `1px solid ${colorCardBorder}88`, background: `linear-gradient(to bottom, ${colorHeaderBg}d8, ${colorHeaderBg}f4)` }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}99, transparent)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 130%, ${colorAccents}28, transparent 55%)` }} />
        </div>

        <div className="mx-auto flex w-[min(1200px,calc(100%-24px))] items-center justify-between py-3">
          <a href="/" className="flex items-center gap-3">
            {logoUrl && (
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border shadow-[0_12px_26px_rgba(185,139,61,0.18)] sm:h-14 sm:w-14 sm:rounded-[22px]"
                style={{ borderColor: colorCardBorder, backgroundColor: colorPanelBg }}
              >
                <img src={logoUrl} alt={salonName} className="h-full w-full object-cover" />
              </div>
            )}
            <div>
              <div className="text-xl leading-none tracking-[-0.03em] md:text-2xl" style={{ fontFamily: "var(--font-salon-name)" }}>
                <span
                  className="bg-clip-text text-transparent [backface-visibility:hidden] leading-none"
                  style={{ backgroundImage: `linear-gradient(to right, ${colorTextMain}, ${colorAccents})` }}
                >
                  {salonName.replace(/[''ʼ]/g, "'")}
                </span>
              </div>
              <div className="mt-0.5 text-[10px] font-semibold uppercase tracking-[0.26em]" style={{ color: colorSubtitles }}>
                Galerie
              </div>
            </div>
          </a>

          <a
            href="/"
            className="btn-shimmer rounded-full px-5 py-2.5 text-sm font-semibold shadow-[0_12px_25px_rgba(17,17,17,0.16)] transition hover:shadow-[0_16px_32px_rgba(17,17,17,0.22)]"
            style={{ backgroundColor: colorAccents, color: contrastText(colorAccents) }}
          >
            Accueil
          </a>
        </div>
      </header>

      <div className="mx-auto w-[min(1200px,calc(100%-32px))] py-8 md:py-12">
        {/* Carte hero — même style que la page principale */}
        {(gallery?.title || gallery?.text) && (
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeUp}
            className="relative mb-10 overflow-hidden rounded-[36px] border border-[var(--hero-edge)] p-8 text-white shadow-[0_24px_70px_rgba(0,0,0,0.22)] before:absolute before:right-[-90px] before:top-[-90px] before:h-64 before:w-64 before:rounded-full before:bg-[var(--hero-edge)] before:blur-3xl md:p-12"
            style={{ background: `linear-gradient(145deg, ${blendHex(colorAccents, colorHeroBg, 0.28)} 0%, ${colorHeroBg} 50%, ${darkenHex(colorHeroBg, 0.3)} 100%)` }}
          >
            {/* Étoiles décoratives animées */}
            <motion.span
              className="pointer-events-none absolute left-8 bottom-8 z-0 text-2xl"
              style={{ color: colorAccents }}
              animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.2, 0.8] }}
              transition={{ duration: 2.4, ease: "easeInOut", repeat: Infinity }}
            >✦</motion.span>
            <motion.span
              className="pointer-events-none absolute right-32 top-10 z-0 text-lg"
              style={{ color: colorAccents }}
              animate={{ opacity: [0.2, 0.8, 0.2], scale: [0.9, 1.15, 0.9] }}
              transition={{ duration: 2.0, ease: "easeInOut", repeat: Infinity, delay: 1.1 }}
            >✦</motion.span>

            {/* Badge */}
            <div className="relative z-10 mb-4 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] backdrop-blur" style={{ color: colorAccents }}>
              Galerie
            </div>

            {gallery.title && (
              <h1 className="relative z-10 mb-4 text-3xl font-black tracking-tight md:text-4xl">
                <motion.span
                  className="inline-block bg-clip-text text-transparent [backface-visibility:hidden]"
                  style={{ backgroundImage: `linear-gradient(to right, ${contrastText(colorHeroBg)}, ${colorAccents}, ${colorGradientEnd})` }}
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 3.2, ease: "easeInOut", repeat: Infinity }}
                >
                  {gallery.title}
                </motion.span>
              </h1>
            )}
            {gallery.text && (
              <p className="relative z-10 max-w-2xl text-base font-medium leading-relaxed">
                <span className="invisible">{gallery.text}</span>
                <span
                  className="absolute inset-0 bg-clip-text text-transparent [backface-visibility:hidden]"
                  style={{ backgroundImage: `linear-gradient(to right, ${colorSubtitles || colorPageBg}, ${colorAccents}, ${colorGradientEnd})` }}
                >
                  {typedText}
                  {typedText.length < gallery.text.length && (
                    <span className="animate-pulse opacity-60">|</span>
                  )}
                </span>
              </p>
            )}

            {/* CTA */}
            {photos.length > 0 && (
              <div className="relative z-10 mt-8">
                <motion.button
                  onClick={() => document.getElementById("photos")?.scrollIntoView({ behavior: "smooth" })}
                  whileHover={{ scale: 1.04, y: -2 }}
                  whileTap={{ scale: 0.97 }}
                  className="btn-shimmer cursor-pointer rounded-full px-6 py-4 font-semibold shadow-lg shadow-black/20 transition hover:shadow-xl"
                  style={{ backgroundColor: colorAccents, color: contrastText(colorAccents) }}
                >
                  Voir les photos ↓
                </motion.button>
              </div>
            )}
          </motion.div>
        )}

        {/* Liste photos */}
        {photos.length > 0 ? (
          <motion.div
            id="photos"
            initial="hidden"
            animate="visible"
            variants={stagger}
            className="flex flex-col gap-6"
          >
            {photos.map((photo, i) => (
              <motion.div
                key={i}
                variants={fadeUp}
                className="grid gap-4 md:grid-cols-2"
              >
                {/* Carte photo */}
                <div
                  className={`group overflow-hidden rounded-2xl border ${i % 2 === 1 ? "md:order-last" : ""}`}
                  style={{ borderColor: colorCardBorder }}
                >
                  <img
                    src={photo.url}
                    alt={photo.caption || `Photo ${i + 1}`}
                    className="h-64 w-full object-cover transition duration-500 group-hover:scale-105 md:h-full md:min-h-[300px]"
                  />
                </div>

                {/* Carte légende */}
                <motion.div
                  whileHover={{ y: -6, scale: 1.02 }}
                  transition={{ duration: 0.25, ease: "easeOut" }}
                  className="group relative flex flex-col justify-center overflow-hidden rounded-[24px] border border-[var(--card-border)] p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-[0_16px_35px_rgba(0,0,0,0.10)]"
                  style={{ backgroundColor: colorPanelBg }}
                >
                  {/* Trait dégradé en haut au hover */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-[24px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  {/* Numéro en filigrane */}
                  <span
                    className="pointer-events-none absolute right-4 bottom-2 select-none text-[7rem] font-black leading-none opacity-[0.06] md:text-[9rem]"
                    style={{ color: colorAccents }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {/* Ligne décorative — identique aux cartes prestation */}
                  <div
                    className="mb-4 h-px w-10 rounded-full opacity-50"
                    style={{ background: `linear-gradient(to right, ${colorAccents}, transparent)` }}
                  />
                  <p
                    className="relative z-10 text-base font-medium leading-[1.8] bg-clip-text text-transparent [backface-visibility:hidden]"
                    style={{ backgroundImage: `linear-gradient(to right, ${colorTitles}, ${colorAccents}, ${colorGradientEnd})` }}
                  >
                    {photo.caption || ""}
                  </p>
                </motion.div>
              </motion.div>
            ))}
          </motion.div>
        ) : (
          <div className="py-24 text-center" style={{ color: colorTextSecondary }}>
            Aucune photo pour le moment.
          </div>
        )}
      </div>

      <footer className="border-t py-8 text-center text-sm" style={{ borderColor: colorCardBorder, color: colorTextSecondary }}>
        © {new Date().getFullYear()} {salonName}
      </footer>
    </main>
  );
}
