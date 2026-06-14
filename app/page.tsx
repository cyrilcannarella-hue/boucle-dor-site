"use client";

import { memo, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { BRAND_NAME } from "@/lib/theme";
import { useSalon } from "@/hooks/useSalon";

type SalonSettings = {
  id: string;
  salon_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  opening_time: string;
  closing_time: string;
  is_open_monday: boolean;
  is_open_tuesday: boolean;
  is_open_wednesday: boolean;
  is_open_thursday: boolean;
  is_open_friday: boolean;
  is_open_saturday: boolean;
  is_open_sunday: boolean;
  opening_time_monday?: string | null;
  closing_time_monday?: string | null;
  opening_time_tuesday?: string | null;
  closing_time_tuesday?: string | null;
  opening_time_wednesday?: string | null;
  closing_time_wednesday?: string | null;
  opening_time_thursday?: string | null;
  closing_time_thursday?: string | null;
  opening_time_friday?: string | null;
  closing_time_friday?: string | null;
  opening_time_saturday?: string | null;
  closing_time_saturday?: string | null;
  opening_time_sunday?: string | null;
  closing_time_sunday?: string | null;
  promo_text?: string | null;
  promo_color_from?: string | null;
  promo_color_to?: string | null;
  promo_text_color?: string | null;
  salon_subtitle?: string | null;
  logo_image_url?: string | null;
  hero_tagline?: string | null;
  hero_description?: string | null;
  hero_features?: string[] | null;
  apropos_title?: string | null;
  apropos_text?: string | null;
  site_prestations?: Array<{ title: string; description: string; price: string }> | null;
  site_reviews?: Array<{ name: string; text: string }> | null;
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
  hero_image_url?: string | null;
  apropos_image_url?: string | null;
  instagram_url?: string | null;
  promo_bg_color?: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: "easeOut" as const } },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function blendHex(hex1: string, hex2: string, ratio: number): string {
  const h1 = hex1.replace("#", "");
  const h2 = hex2.replace("#", "");
  const r = Math.round(parseInt(h1.slice(0,2),16)*ratio + parseInt(h2.slice(0,2),16)*(1-ratio));
  const g = Math.round(parseInt(h1.slice(2,4),16)*ratio + parseInt(h2.slice(2,4),16)*(1-ratio));
  const b = Math.round(parseInt(h1.slice(4,6),16)*ratio + parseInt(h2.slice(4,6),16)*(1-ratio));
  return `#${r.toString(16).padStart(2,"0")}${g.toString(16).padStart(2,"0")}${b.toString(16).padStart(2,"0")}`;
}

function formatPhoneHref(phone: string | null | undefined) {
  if (!phone) return "tel:0986678830";
  return `tel:${phone.replace(/\s+/g, "")}`;
}


const SalonNamePremium = memo(function SalonNamePremium({
  name,
  compact = false,
  goldColor = "#d8a646",
  gradientMidColor,
  gradientEndColor = "#9f742f",
}: {
  name: string;
  compact?: boolean;
  goldColor?: string;
  gradientMidColor?: string;
  gradientEndColor?: string;
}) {
  const normalizedName = (name || "Boucle d’Or").replace(/[‘’ʼ]/g, "’");
  const gradient = gradientMidColor
    ? `linear-gradient(to right, ${goldColor}, ${gradientMidColor}, ${gradientEndColor})`
    : `linear-gradient(to right, ${goldColor}, ${gradientEndColor})`;
  return (
    <span
      className={`bg-clip-text text-transparent [backface-visibility:hidden] ${compact ? "leading-none" : "leading-tight"}`}
      style={{ backgroundImage: gradient }}
    >
      {normalizedName}
    </span>
  );
});

export default function Home() {
  const { id: salonId } = useSalon();
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showReservationPulse, setShowReservationPulse] = useState(false);
  const [headerVisible, setHeaderVisible] = useState(true);
  const [typedTagline, setTypedTagline] = useState("");
  const [typedDesc, setTypedDesc] = useState("");
  const lastScrollY = useRef(0);
  const { scrollYProgress } = useScroll();
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const glowRotate = useTransform(scrollYProgress, [0, 1], [0, 32]);
  const heroImageY = useTransform(scrollYProgress, [0, 0.5], [0, 45]);

  useEffect(() => {
    const tagline = settings?.hero_tagline || "L'élégance au naturel";
    const name = settings?.salon_name || "Boucle d'Or";
    const desc = settings?.hero_description || `${name}, votre salon de coiffure à taille humaine à Rognac. Écoute, conseil et savoir-faire pour sublimer vos cheveux.`;
    setTypedTagline("");
    setTypedDesc("");
    let i = 0;
    const taglineInterval = setInterval(() => {
      i++;
      setTypedTagline(tagline.slice(0, i));
      if (i >= tagline.length) {
        clearInterval(taglineInterval);
        let j = 0;
        const descInterval = setInterval(() => {
          j++;
          setTypedDesc(desc.slice(0, j));
          if (j >= desc.length) clearInterval(descInterval);
        }, 18);
      }
    }, 45);
    return () => { clearInterval(taglineInterval); };
  }, [settings?.hero_tagline, settings?.hero_description, settings?.salon_name]);

useEffect(() => {
  const handleScroll = () => {
    setShowBackToTop(window.scrollY > 520);
  };

  handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });

  return () => window.removeEventListener("scroll", handleScroll);
}, []);

useEffect(() => {
  const handleScrollDir = () => {
    const currentY = window.scrollY;
    setHeaderVisible(currentY < 80 || currentY < lastScrollY.current);
    lastScrollY.current = currentY;
  };
  window.addEventListener("scroll", handleScrollDir, { passive: true });
  return () => window.removeEventListener("scroll", handleScrollDir);
}, []);

useEffect(() => {
  let timer: ReturnType<typeof setTimeout>;
  const reset = () => {
    setShowReservationPulse(false);
    clearTimeout(timer);
    timer = setTimeout(() => setShowReservationPulse(true), 3000);
  };
  const events = ["mousemove", "scroll", "keydown", "click", "touchstart"] as const;
  events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
  reset();
  return () => {
    clearTimeout(timer);
    events.forEach((e) => window.removeEventListener(e, reset));
  };
}, []);

  useEffect(() => {
    const loadSettings = async () => {
      const supabase = createClient();

      const { data } = await supabase
        .from("salon_settings")
        .select("*")
        .eq("salon_id", salonId)
        .maybeSingle();

      setSettings((data ?? null) as SalonSettings | null);
    };

    loadSettings();
  }, [salonId]);

  const salonName = settings?.salon_name || "Boucle d’Or";
  const salonPhone = settings?.phone || "09 86 67 88 30";
  const salonAddress = settings?.address || "33 Rue Gabriel Péri, 13340 Rognac";
  const openingTime = settings?.opening_time?.slice(0, 5) || "09:00";
  const closingTime = settings?.closing_time?.slice(0, 5) || "19:00";

  const salonSubtitle = settings?.salon_subtitle || "Salon de coiffure";
  const heroTagline = settings?.hero_tagline || "L'élégance au naturel";
  const heroDescription = settings?.hero_description || `${salonName}, votre salon de coiffure à taille humaine à Rognac. Écoute, conseil et savoir-faire pour sublimer vos cheveux.`;
  const heroFeatures = settings?.hero_features?.length
    ? settings.hero_features
    : ["Techniques de professionnels", "Produits de qualité", "Ambiance chaleureuse"];
  const aproposTitle = settings?.apropos_title || "un salon à taille humaine";
  const prestations = settings?.site_prestations?.filter((p) => p.title.trim() || p.description.trim() || p.price.trim()).length
    ? settings.site_prestations.filter((p) => p.title.trim() || p.description.trim() || p.price.trim())
    : [
        { title: "Coupe & brushing", description: "Coupe sur-mesure, brushing, mise en forme", price: "À partir de 28€" },
        { title: "Coloration", description: "Coloration, mèches, balayage, ombré hair", price: "À partir de 45€" },
        { title: "Soins & traitements", description: "Soins profonds, lissage, botox capillaire", price: "À partir de 20€" },
        { title: "Coiffures", description: "Attaches, chignons, coiffures événementielles", price: "À partir de 35€" },
      ];
  const aproposText = settings?.apropos_text || `Chez ${salonName}, chaque rendez-vous est pensé comme un vrai moment de bien-être. Virginie vous accueille dans une ambiance conviviale, avec une attention particulière portée à l'écoute, au conseil et au résultat.`;
  const allReviews = settings?.site_reviews ?? [];
  const reviews = allReviews.filter((r) => r.name?.trim() || r.text?.trim());
  const logoImageUrl = settings?.logo_image_url || "/icon-192.png";
  const heroImageUrl = settings?.hero_image_url || "/images/hero-salon.jpg";
  const aproposImageUrl = settings?.apropos_image_url || "/images/apropos-salon.jpg";
  const colorTitles = settings?.color_titles || "#b98b3d";
  const colorBadges = settings?.color_titles || "#b98b3d";
  const colorAccents = settings?.color_accents || "#d8a646";
  const colorButtons = settings?.color_accents || "#d8a646";
  const colorHeroCard = settings?.color_contact_bg || "#111111";
  const colorContactBg = settings?.color_contact_bg || "#111111";
  const colorPageBg = settings?.color_page_bg || "#f5e9dc";
  const colorTextMain = settings?.color_text_main || "#1f1b17";
  const colorTextSecondary = settings?.color_text_secondary || "#6e655c";
  const colorHeaderBg = settings?.color_header_bg || "#F2E8D9";
  const colorCardBorder = settings?.color_card_border || "#e7ddd0";
  const colorNavText = settings?.color_nav_text || "#4d4034";
  const colorFooterText = settings?.color_text_secondary || "#8a7a67";
  const colorGradientStart = settings?.color_contact_bg || "#2e2118";
  const colorGradientEnd = settings?.color_gradient_end || "#9f742f";
  const promoGradientFrom = settings?.promo_color_from || "#d8a646";
  const promoGradientTo = settings?.promo_color_to || "#b98b3d";
  const promoTextColor = settings?.promo_text_color || "#ffffff";
  const promoBgColor = settings?.promo_bg_color || colorContactBg;
  const instagramUrl = settings?.instagram_url || null;
  const salonEmail = settings?.email || null;

  return (
<main
        id="top"
        className="relative min-h-screen overflow-hidden scroll-smooth before:pointer-events-none before:absolute before:left-1/2 before:top-[-180px] before:h-[420px] before:w-[420px] before:-translate-x-1/2 before:rounded-full before:bg-[rgb(var(--accent-rgb))]/20 before:blur-3xl"
        style={{ background: `radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.24), transparent 34%), ${colorPageBg}`, color: colorTextMain }}
      >
      <style>{`
        :root {
          --gold: ${colorAccents};
          --gold-light: ${colorAccents};
          --gold-deep: ${colorAccents};
          --header-bg: ${colorHeaderBg};
          --card-border: ${colorCardBorder};
          --nav-text: ${colorNavText};
          --footer-text: ${colorFooterText};
          --gradient-start: ${colorGradientStart};
          --gradient-end: ${colorGradientEnd};
          --accent-rgb: ${hexToRgb(colorAccents)};
        }
      `}</style>
  <motion.div
    className="fixed left-0 top-0 z-[9998] h-1 origin-left bg-gradient-to-r from-[var(--gold)] via-[var(--gold)] to-[var(--gold)] shadow-[0_0_18px_rgba(216,166,70,0.55)]"
    style={{ scaleX: scrollYProgress }}
  />

  <motion.div
    aria-hidden="true"
    style={{ y: glowY, rotate: glowRotate, backgroundColor: `${colorAccents}33` }}
    className="pointer-events-none fixed right-[-90px] top-[190px] z-0 h-56 w-56 rounded-full blur-3xl"
  />
  <motion.div
    aria-hidden="true"
    style={{ y: glowY, backgroundColor: `${colorAccents}1a` }}
    className="pointer-events-none fixed left-[-120px] top-[520px] z-0 h-64 w-64 rounded-full blur-3xl"
  />

      <motion.header
        className="sticky top-0 z-50 shadow-[0_14px_45px_rgba(80,55,25,0.10)] backdrop-blur-md"
        style={{ borderBottom: `1px solid ${colorCardBorder}88`, background: `linear-gradient(to bottom, ${colorHeaderBg}d8, ${colorHeaderBg}f4)` }}
        animate={{ y: headerVisible ? 0 : "-100%" }}
        transition={{ duration: 0.28, ease: "easeInOut" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {/* Ligne haut */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          {/* Ligne bas dorée */}
          <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}99, transparent)` }} />
          {/* Halo radial centré */}
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 130%, ${colorAccents}28, transparent 55%)` }} />
          {/* Balayage doré */}
          <motion.div
            className="absolute inset-y-0 w-1/3 -skew-x-12"
            style={{ background: `linear-gradient(to right, transparent, ${colorAccents}28, transparent)` }}
            animate={{ x: ["-60%", "380%"] }}
            transition={{ duration: 5, ease: "easeInOut", repeat: Infinity, repeatDelay: 3 }}
          />
        </div>

        <div className="mx-auto w-[min(1200px,calc(100%-24px))] py-3">
          {/* Rangée 1 : logo + nom (toutes tailles) + boutons mobiles */}
          <div className="flex items-center gap-3 md:justify-center">
            <motion.a
              href="#top"
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
              className="group flex min-w-0 items-center gap-3"
              aria-label="Retour en haut de page"
            >
              <div className="h-14 w-14 shrink-0 flex items-center justify-center overflow-hidden rounded-[22px] border shadow-[0_12px_26px_rgba(185,139,61,0.18)]" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                <img src={logoImageUrl} alt={BRAND_NAME} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0">
                <div className="text-2xl leading-none tracking-[-0.04em] md:text-4xl">
                  <SalonNamePremium name={salonName} compact goldColor={colorTextMain} gradientEndColor={colorAccents} />
                </div>
                <div className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.26em] text-[var(--footer-text)] sm:block">
                  {salonSubtitle}
                </div>
              </div>
            </motion.a>

            {/* Boutons visibles uniquement sous md (sm + mobile) */}
            <div className="ml-auto flex items-center gap-2 md:hidden">
              <motion.a
                href="/espace-client"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ backgroundColor: colorButtons, color: colorTextMain }}
                className="hidden btn-shimmer rounded-full px-4 py-3 text-sm font-semibold shadow-[0_12px_25px_rgba(17,17,17,0.16)] sm:block"
              >
                Mes réservations
              </motion.a>
              <motion.a
                href="/reservation"
                whileTap={{ scale: 0.96 }}
                animate={showReservationPulse ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={showReservationPulse ? { repeat: Infinity, duration: 1.8, ease: "easeInOut" } : { duration: 0.3 }}
                style={{ backgroundColor: colorButtons, color: colorTextMain }}
                className="btn-shimmer rounded-full px-4 py-3 text-sm font-semibold shadow-[0_12px_25px_rgba(17,17,17,0.16)]"
              >
                Prendre RDV
              </motion.a>
            </div>
          </div>

          {/* Rangée 2 : nav + boutons — desktop uniquement (md+) */}
          <div className="hidden md:grid md:grid-cols-3 items-center pt-2">
            {/* Gauche */}
            <div className="flex justify-start">
              <motion.a
                href="/espace-client"
                whileHover={{ y: -2, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                style={{ backgroundColor: colorButtons, color: colorTextMain }}
                className="btn-shimmer rounded-full px-4 py-3 text-sm font-semibold shadow-[0_12px_25px_rgba(17,17,17,0.16)]"
              >
                Mes réservations
              </motion.a>
            </div>

            {/* Centre */}
            <div className="flex justify-center">
              <nav className="flex items-center rounded-full border border-white/55 bg-white/45 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_30px_rgba(80,55,25,0.06)] backdrop-blur-xl">
                {[
                  ["Prestations", "#prestations"],
                  ["À propos", "#apropos"],
                  ["Contact", "#contact"],
                ].map(([label, href]) => (
                  <a
                    key={label}
                    href={href}
                    className="group relative whitespace-nowrap rounded-full px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition duration-300 hover:bg-white/70 hover:text-[var(--gradient-end)]"
                  >
                    {label}
                    <span className="absolute inset-x-4 -bottom-0.5 h-px scale-x-0 rounded-full bg-gradient-to-r from-[var(--gold)] via-[#f3d27a] to-[var(--gradient-end)] transition-transform duration-300 group-hover:scale-x-100" />
                  </a>
                ))}

                {instagramUrl && (
                  <a
                    href={instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition duration-300 hover:bg-white/70 hover:text-[var(--gradient-end)]"
                    aria-label="Instagram"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                      <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM17.5 6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z" />
                    </svg>
                    Instagram
                  </a>
                )}
              </nav>
            </div>

            {/* Droite */}
            <div className="flex justify-end">
              <motion.a
                href="/reservation"
                whileHover={{ y: -2, scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                animate={showReservationPulse ? { scale: [1, 1.05, 1] } : { scale: 1 }}
                transition={showReservationPulse ? { repeat: Infinity, duration: 1.8, ease: "easeInOut" } : { duration: 0.3 }}
                style={{ backgroundColor: colorButtons, color: colorTextMain }}
                className="btn-shimmer rounded-full px-5 py-3 text-sm font-semibold shadow-[0_14px_30px_rgba(17,17,17,0.18)] transition hover:shadow-[0_18px_38px_rgba(17,17,17,0.24)]"
              >
                Prendre RDV
              </motion.a>
            </div>
          </div>
        </div>

        <div className="border-t border-white/40 bg-white/20 md:hidden">
          <div className="mx-auto grid w-[min(1200px,calc(100%-24px))] gap-2 py-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/espace-client"
                className="btn-shimmer rounded-full px-3 py-2 text-center font-semibold transition active:scale-95"
                style={{ backgroundColor: colorButtons, color: colorTextMain }}
              >
                Mes réservations
              </a>

              {instagramUrl && (
                <a
                  href={instagramUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-white/45 bg-white/55 px-3 py-2 text-center font-semibold text-[var(--nav-text)] transition active:scale-95"
                >
                  Instagram
                </a>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                ["Prestations", "#prestations"],
                ["À propos", "#apropos"],
                ["Contact", "#contact"],
              ].map(([label, href]) => (
                <a
                  key={label}
                  href={href}
                  className="rounded-full border border-white/45 bg-white/40 px-2 py-2 text-center text-[13px] font-medium text-[var(--nav-text)] transition active:scale-95"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </motion.header>

      {settings?.promo_text?.trim() ? (
        <div className="relative z-40 overflow-hidden px-4 py-3.5" style={{ background: `linear-gradient(to right, ${promoBgColor}, ${promoGradientFrom}55, ${promoBgColor})` }}>
          {/* Lignes haut et bas */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-70" />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-40" />
          {/* Halo central */}
          <div className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(ellipse at center, ${promoGradientFrom}22, transparent 65%)` }} />
          {/* Balayage lumineux */}
          <motion.div
            className="pointer-events-none absolute inset-y-0 w-1/3 -skew-x-12"
            style={{ background: "linear-gradient(to right, transparent, rgba(255,255,255,0.09), transparent)" }}
            animate={{ x: ["-100%", "450%"] }}
            transition={{ duration: 3.5, ease: "easeInOut", repeat: Infinity, repeatDelay: 2.5 }}
          />
          <p className="relative text-center text-base font-semibold tracking-[0.06em]" style={{ color: promoTextColor }}>
            <motion.span
              className="mr-3 inline-block"
              style={{ color: promoGradientFrom }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity }}
            >✦</motion.span>
            {settings.promo_text.trim()}
            <motion.span
              className="ml-3 inline-block"
              style={{ color: promoGradientFrom }}
              animate={{ opacity: [0.5, 1, 0.5], scale: [0.85, 1.15, 0.85] }}
              transition={{ duration: 2.2, ease: "easeInOut", repeat: Infinity, delay: 1.1 }}
            >✦</motion.span>
          </p>
        </div>
      ) : null}

      <section className="relative z-10 mx-auto grid w-[min(1200px,calc(100%-32px))] gap-6 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(216,166,70,0.26),transparent_30%),linear-gradient(145deg,#18130f_0%,#0f0f0f_55%,#2a1d12_100%)] p-8 text-white shadow-[0_24px_70px_rgba(72,48,22,0.22)] before:absolute before:right-[-90px] before:top-[-90px] before:h-64 before:w-64 before:rounded-full before:bg-[#d8a646]/20 before:blur-3xl"
          style={{ background: `linear-gradient(145deg, ${blendHex(colorAccents, colorHeroCard, 0.28)} 0%, ${colorHeroCard} 50%, #050505 100%)` }}
        >
          <motion.div variants={fadeUp} className="relative z-10 mb-3 inline-flex rounded-full border border-white/15 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] backdrop-blur" style={{ color: colorBadges }}>
            {salonSubtitle}
          </motion.div>
          <motion.h1 variants={fadeUp} className="relative z-10 max-w-xl text-5xl leading-[0.95] tracking-[-0.06em] md:text-7xl">
            <SalonNamePremium name={salonName} goldColor={colorPageBg} gradientMidColor={colorAccents} gradientEndColor={colorGradientEnd} />
            <br />
            <span className="relative mt-3 inline-block text-3xl font-light tracking-[-0.03em] md:text-5xl">
              <span className="invisible">{heroTagline}</span>
              <span className="absolute inset-0 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${colorPageBg}, ${colorAccents}, ${colorGradientEnd})` }}>
                {typedTagline}
                {typedTagline.length < heroTagline.length && (
                  <span className="animate-pulse ml-0.5 bg-clip-text text-transparent" style={{ backgroundImage: `linear-gradient(to right, ${colorPageBg}, ${colorAccents})` }}>|</span>
                )}
              </span>
            </span>
          </motion.h1>
          <motion.p variants={fadeUp} className="relative z-10 mt-6 max-w-xl text-lg" style={{ color: `${colorPageBg}bf` }}>
            <span className="invisible">{heroDescription}</span>
            <span className="absolute inset-0">
              {typedDesc}
              {typedDesc.length < heroDescription.length && typedTagline.length >= heroTagline.length && (
                <span className="animate-pulse opacity-60">|</span>
              )}
            </span>
          </motion.p>

          <motion.div variants={fadeUp} className="relative z-10 mt-8 flex flex-wrap gap-3">
            <motion.a
              href="/reservation"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="btn-shimmer rounded-full px-6 py-4 font-semibold shadow-lg shadow-black/20 transition hover:shadow-xl"
              style={{ backgroundColor: colorButtons, color: colorTextMain }}
            >
              Réserver en ligne
            </motion.a>
            <motion.a
              href="#prestations"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full border px-6 py-4 font-semibold transition hover:bg-white/5"
              style={{ borderColor: `${colorButtons}60`, color: colorButtons }}
            >
              Découvrir nos prestations
            </motion.a>
          </motion.div>

          <motion.div variants={fadeUp} className="relative z-10 mt-10 grid gap-4 text-sm md:grid-cols-3" style={{ color: `${colorPageBg}cc` }}>
            {heroFeatures.map((feat, i) => (
              <div key={feat} className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 p-4 text-center">
                <span className="shrink-0" style={{ color: colorBadges }}>
                  {i % 3 === 0 && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M13.024 9.25c.47 0 .827-.433.637-.863a4 4 0 0 0-4.094-2.36c-.468.05-.665.576-.43.984l.361.644c.14.25.42.38.696.338a2.5 2.5 0 0 1 2.43 1.394c.167.34.496.863.4-.137ZM9.5 11.5a2.5 2.5 0 0 1-2.5-2.5 2.5 2.5 0 0 1 .27-1.138c.14-.25.073-.568-.172-.718L5.98 6.5a.75.75 0 0 0-1.03.274 4 4 0 1 0 6.818 3.969.75.75 0 0 0-.818-1.023A2.497 2.497 0 0 1 9.5 11.5Z" />
                      <path fillRule="evenodd" d="M14.28 10.72a.75.75 0 0 1 0 1.06l-7.5 7.5a.75.75 0 0 1-1.06-1.06l7.5-7.5a.75.75 0 0 1 1.06 0ZM4.72 10.72a.75.75 0 0 0 0 1.06l1.5 1.5a.75.75 0 0 0 1.06-1.06l-1.5-1.5a.75.75 0 0 0-1.06 0Z" clipRule="evenodd" />
                    </svg>
                  )}
                  {i % 3 === 1 && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
                    </svg>
                  )}
                  {i % 3 === 2 && (
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 0 1-1.162-.682 22.045 22.045 0 0 1-2.582-2.184C4.045 12.376 2 9.805 2 6.5a4.5 4.5 0 0 1 8-2.828A4.5 4.5 0 0 1 18 6.5c0 3.305-2.045 5.876-3.885 7.516a22.049 22.049 0 0 1-3.744 2.866l-.02.01-.006.003-.001.001a.752.752 0 0 1-.69.001l-.001-.001Z" />
                    </svg>
                  )}
                </span>
                <span>{feat}</span>
              </div>
            ))}
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ clipPath: "inset(0 100% 0 0 round 32px)" }}
          animate={{ clipPath: "inset(0 0% 0 0 round 32px)" }}
          transition={{ duration: 1.0, ease: [0.76, 0, 0.24, 1], delay: 0.3 }}
          className="relative min-h-[520px] overflow-hidden rounded-[32px] border border-[var(--card-border)] shadow-[0_18px_50px_rgba(0,0,0,0.05)]"
        >
          <motion.img
            src={heroImageUrl}
            alt={`Salon ${salonName}`}
            className="absolute -top-[45px] left-0 h-[calc(100%+90px)] w-full object-cover"
            style={{ y: heroImageY }}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </motion.div>
      </section>

      <section
        id="prestations"
        className="mx-auto w-[min(1200px,calc(100%-32px))] scroll-mt-44 md:scroll-mt-28 py-10"
      >
        <div className="mb-6">
          <div className="inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorTitles, borderColor: `${colorTitles}40`, backgroundColor: `${colorTitles}12` }}>
            Prestations
          </div>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {prestations.map((p) => (
            <motion.article
              key={p.title}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="group relative flex flex-col overflow-hidden rounded-[24px] border border-[var(--card-border)] bg-white/65 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-[0_16px_35px_rgba(0,0,0,0.10)]"
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 rounded-t-[24px] bg-gradient-to-r from-transparent via-[var(--gold)] to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

              <div className="mb-4 h-px w-10 rounded-full opacity-50" style={{ background: `linear-gradient(to right, ${colorAccents}, transparent)` }} />

              <h3 className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gold)] to-[var(--gradient-end)] bg-clip-text text-xl font-semibold leading-snug text-transparent">{p.title}</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed" style={{ color: colorTextSecondary }}>{p.description}</p>
              <p className="mt-5 text-base font-bold" style={{ color: colorTitles }}>{p.price}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <motion.section
        id="apropos"
        variants={staggerContainer}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        className="mx-auto grid w-[min(1200px,calc(100%-32px))] scroll-mt-44 md:scroll-mt-28 gap-6 py-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <motion.div
          variants={fadeUp}
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-[28px] border border-[var(--card-border)] bg-white/65 p-6 shadow-sm backdrop-blur"
        >
          <div className="mb-4 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorTitles, borderColor: `${colorTitles}40`, backgroundColor: `${colorTitles}12` }}>
            À propos
          </div>
          <h2 className="bg-gradient-to-r from-[var(--gradient-start)] via-[var(--gold)] to-[var(--gradient-end)] bg-clip-text text-4xl text-transparent">{salonName}, {aproposTitle}</h2>
          <p className="mt-4" style={{ color: colorTextSecondary }}>{aproposText}</p>
        </motion.div>

        <motion.div
          variants={fadeUp}
          whileHover={{ y: -6, scale: 1.02 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
          className="rounded-[28px] border border-[var(--card-border)] bg-white/65 p-6 shadow-sm backdrop-blur"
        >
          <motion.img
            src={aproposImageUrl}
            alt={`Espace shampoing du salon ${salonName}`}
            className="h-full min-h-[260px] w-full rounded-[22px] object-cover"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
      </motion.section>

      {reviews.length > 0 && (
      <section className="mx-auto w-[min(1200px,calc(100%-32px))] py-10">
        <div className="mb-6">
          <div className="mb-4 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorTitles, borderColor: `${colorTitles}40`, backgroundColor: `${colorTitles}12` }}>
            Avis clients
          </div>
        </div>

        <div className="overflow-hidden">
          <div className="carousel-track flex gap-4">
            {[...reviews, ...reviews].map((review, i) => (
              <article
                key={`${review.name}-${i}`}
                className="flex w-80 shrink-0 flex-col rounded-[24px] border border-[var(--card-border)] p-6 shadow-sm backdrop-blur"
                style={{ background: `linear-gradient(135deg, ${colorTitles}0d 0%, #ffffff 60%)` }}
              >
                <p style={{ color: colorTextSecondary }}>
                  <span style={{ color: colorTitles }}>"</span>{review.text}<span style={{ color: colorTitles }}>"</span>
                </p>
                <div className="mt-auto pt-5 font-semibold" style={{ color: colorTitles }}>{review.name}</div>
              </article>
            ))}
          </div>
        </div>
      </section>
      )}

      <section
        id="contact"
        className="mx-auto w-[min(1200px,calc(100%-32px))] scroll-mt-44 md:scroll-mt-28 py-10 pb-20"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-[30px] p-8 text-white"
          style={{ background: `linear-gradient(145deg, ${blendHex(colorAccents, colorContactBg, 0.22)} 0%, ${colorContactBg} 50%, #050505 100%)` }}
        >
          <div className="mb-4 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorTitles, borderColor: `${colorTitles}40`, backgroundColor: `${colorTitles}12` }}>
            Contact
          </div>

          <div className={`mt-6 grid gap-4 ${salonEmail ? "sm:grid-cols-2 xl:grid-cols-4" : "md:grid-cols-3"}`}>
            <a
              href={`https://maps.google.com/?q=${encodeURIComponent(salonAddress)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="group rounded-[20px] border border-white/10 p-5 transition hover:border-white/25 hover:bg-white/5"
            >
              <strong className="flex items-center gap-2">
                Adresse
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-50 transition group-hover:opacity-100">
                  <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 0 0-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 0 0 .75-.75v-4a.75.75 0 0 1 1.5 0v4A2.25 2.25 0 0 1 12.75 17h-8.5A2.25 2.25 0 0 1 2 14.75v-8.5A2.25 2.25 0 0 1 4.25 4h5a.75.75 0 0 1 0 1.5h-5Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 0 0 1.06.053L16.5 4.44v2.81a.75.75 0 0 0 1.5 0v-4.5a.75.75 0 0 0-.75-.75h-4.5a.75.75 0 0 0 0 1.5h2.553l-9.056 8.194a.75.75 0 0 0-.053 1.06Z" clipRule="evenodd" />
                </svg>
              </strong>
              <p className="mt-2 whitespace-pre-line text-white/75 group-hover:text-white/90 transition">
                {salonAddress}
              </p>
            </a>

            <a
              href={formatPhoneHref(salonPhone)}
              className="group rounded-[20px] border border-white/10 p-5 transition hover:border-white/25 hover:bg-white/5"
            >
              <strong className="flex items-center gap-2">
                Téléphone
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-50 transition group-hover:opacity-100">
                  <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 0 1 3.5 2h1.148a1.5 1.5 0 0 1 1.465 1.175l.716 3.223a1.5 1.5 0 0 1-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 0 0 6.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 0 1 1.767-1.052l3.223.716A1.5 1.5 0 0 1 18 16.352V17.5a1.5 1.5 0 0 1-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 0 1 2.43 8.326 13.019 13.019 0 0 1 2 5V3.5Z" clipRule="evenodd" />
                </svg>
              </strong>
              <p className="mt-2 text-white/75 group-hover:text-white/90 transition">{salonPhone}</p>
            </a>

            {salonEmail && (
              <a
                href={`mailto:${salonEmail}`}
                className="group rounded-[20px] border border-white/10 p-5 transition hover:border-white/25 hover:bg-white/5"
              >
                <strong className="flex items-center gap-2">
                  Email
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5 opacity-50 transition group-hover:opacity-100">
                    <path d="M3 4a2 2 0 0 0-2 2v1.161l8.441 4.221a1.25 1.25 0 0 0 1.118 0L19 7.162V6a2 2 0 0 0-2-2H3Z" />
                    <path d="m19 8.839-7.77 3.885a2.75 2.75 0 0 1-2.46 0L1 8.839V14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8.839Z" />
                  </svg>
                </strong>
                <p className="mt-2 text-white/75 group-hover:text-white/90 transition break-all">{salonEmail}</p>
              </a>
            )}

            <div className="rounded-[20px] border border-white/10 p-5">
              <strong>Horaires</strong>

              <div className="mt-3 grid gap-2 text-white/75">
                {([
                  ["Lundi",    "is_open_monday",    "opening_time_monday",    "closing_time_monday"],
                  ["Mardi",    "is_open_tuesday",   "opening_time_tuesday",   "closing_time_tuesday"],
                  ["Mercredi", "is_open_wednesday", "opening_time_wednesday", "closing_time_wednesday"],
                  ["Jeudi",    "is_open_thursday",  "opening_time_thursday",  "closing_time_thursday"],
                  ["Vendredi", "is_open_friday",    "opening_time_friday",    "closing_time_friday"],
                  ["Samedi",   "is_open_saturday",  "opening_time_saturday",  "closing_time_saturday"],
                  ["Dimanche", "is_open_sunday",    "opening_time_sunday",    "closing_time_sunday"],
                ] as [string, keyof SalonSettings, keyof SalonSettings, keyof SalonSettings][]).map(([label, openKey, openTimeKey, closeTimeKey]) => {
                  const isOpen = settings?.[openKey];
                  const open = (settings?.[openTimeKey] as string | null)?.slice(0, 5) ?? openingTime;
                  const close = (settings?.[closeTimeKey] as string | null)?.slice(0, 5) ?? closingTime;
                  return (
                    <div key={label} className="flex justify-between gap-4">
                      <span>{label}</span>
                      <span>{isOpen ? `${open} à ${close}` : "Fermé"}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={formatPhoneHref(salonPhone)}
              className="rounded-full px-6 py-4 font-semibold"
              style={{ backgroundColor: colorButtons, color: colorTextMain }}
            >
              Appeler le salon
            </a>
            <a
              href="/reservation"
              className="btn-shimmer rounded-full px-6 py-4 font-semibold shadow-lg shadow-black/20 transition hover:shadow-xl"
              style={{ backgroundColor: colorButtons, color: colorTextMain }}
            >
              Réserver en ligne
            </a>
          </div>
        </motion.div>
      </section>

      <footer className="relative z-10 backdrop-blur" style={{ borderTop: `1px solid ${colorCardBorder}99`, backgroundColor: `${colorHeaderBg}cc` }}>
        <div className="mx-auto w-[min(1200px,calc(100%-32px))] py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-[var(--footer-text)]">
            © {new Date().getFullYear()} {salonName} — {salonAddress}
          </p>
          {instagramUrl && (
            <a
              href={instagramUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-[var(--footer-text)] transition hover:text-[var(--gradient-end)]"
              aria-label="Instagram"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM17.5 6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z" />
              </svg>
              Instagram
            </a>
          )}
        </div>
      </footer>

      <AnimatePresence>
        {showBackToTop && (
          <motion.a
            href="#top"
            initial={{ opacity: 0, y: 18, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.92 }}
            whileHover={{ y: -3, scale: 1.04 }}
            whileTap={{ scale: 0.96 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="fixed bottom-5 right-5 z-50 flex h-12 w-12 items-center justify-center rounded-full border border-white/45 bg-[#111111] text-xl text-white shadow-[0_18px_40px_rgba(17,17,17,0.22)] backdrop-blur-xl"
            aria-label="Retour en haut"
          >
            ↑
          </motion.a>
        )}
      </AnimatePresence>
    </main>
  );
}
