"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useScroll, useTransform } from "framer-motion";
import { createClient } from "@/utils/supabase/client";
import { BRAND_NAME } from "@/lib/theme";

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
  promo_text?: string | null;
};

const fadeUp = {
  hidden: { opacity: 0, y: 26 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.12,
    },
  },
};

function formatPhoneHref(phone: string | null | undefined) {
  if (!phone) return "tel:0986678830";
  return `tel:${phone.replace(/\s+/g, "")}`;
}


function SalonNamePremium({ name, compact = false }: { name: string; compact?: boolean }) {
  const normalizedName = name || "Boucle d’Or";
  const match = normalizedName.match(/^(.*?)(Or)$/i);

  if (!match) {
    return <span>{normalizedName}</span>;
  }

  return (
    <span className={compact ? "leading-none" : "leading-tight"}>
      {match[1]}
      <span className="bg-gradient-to-r from-[var(--gold)] via-[#f3d27a] to-[#9f742f] bg-clip-text text-transparent drop-shadow-[0_8px_20px_rgba(185,139,61,0.25)]">
        {match[2]}
      </span>
    </span>
  );
}

export default function Home() {
  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [showSplash, setShowSplash] = useState(true);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const { scrollYProgress } = useScroll();
  const glowY = useTransform(scrollYProgress, [0, 1], [0, 220]);
  const glowRotate = useTransform(scrollYProgress, [0, 1], [0, 32]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setShowSplash(false);
    }, 1300);

    return () => window.clearTimeout(timer);
  }, []);

useEffect(() => {
  const handleScroll = () => {
    setShowBackToTop(window.scrollY > 520);
  };

  handleScroll();
  window.addEventListener("scroll", handleScroll, { passive: true });

  return () => window.removeEventListener("scroll", handleScroll);
}, []);

  useEffect(() => {
    const loadSettings = async () => {
      const supabase = createClient();

      const { data } = await supabase
        .from("salon_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      setSettings((data ?? null) as SalonSettings | null);
    };

    loadSettings();
  }, []);

  const salonName = settings?.salon_name || "Boucle d’Or";
  const salonPhone = settings?.phone || "09 86 67 88 30";
  const salonAddress = settings?.address || "33 Rue Gabriel Péri, 13340 Rognac";
  const openingTime = settings?.opening_time?.slice(0, 5) || "09:00";
  const closingTime = settings?.closing_time?.slice(0, 5) || "19:00";

  return (
<main id="top" className="relative min-h-screen overflow-hidden scroll-smooth bg-[radial-gradient(circle_at_top_left,rgba(216,166,70,0.24),transparent_34%),linear-gradient(135deg,#fffaf2_0%,#f6eee2_45%,#ead8c0_100%)] text-[#1f1b17] before:pointer-events-none before:absolute before:left-1/2 before:top-[-180px] before:h-[420px] before:w-[420px] before:-translate-x-1/2 before:rounded-full before:bg-[#d8a646]/20 before:blur-3xl">
  <motion.div
    className="fixed left-0 top-0 z-[9998] h-1 origin-left bg-gradient-to-r from-[var(--gold)] via-[#f3d27a] to-[#9f742f] shadow-[0_0_18px_rgba(216,166,70,0.55)]"
    style={{ scaleX: scrollYProgress }}
  />

  <motion.div
    aria-hidden="true"
    style={{ y: glowY, rotate: glowRotate }}
    className="pointer-events-none fixed right-[-90px] top-[190px] z-0 h-56 w-56 rounded-full bg-[#d8a646]/20 blur-3xl"
  />
  <motion.div
    aria-hidden="true"
    style={{ y: glowY }}
    className="pointer-events-none fixed left-[-120px] top-[520px] z-0 h-64 w-64 rounded-full bg-[#fff2c8]/55 blur-3xl"
  />

      <AnimatePresence>
        {showSplash && (
          <motion.div
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[#F5E9DC]"
            initial={{ opacity: 1 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
          >
            <motion.div
              className="flex flex-col items-center gap-4"
              initial={{ opacity: 0, scale: 0.92, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: -8 }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <img
                src="/icon-192.png"
                alt="Boucle d’Or"
                className="h-28 w-28 rounded-[28px] shadow-[0_18px_45px_rgba(80,55,25,0.18)]"
              />
              <div className="text-center">
                <p className="text-xl font-semibold tracking-wide text-[#2E2118]">
                  Boucle d’Or
                </p>
                <p className="mt-1 text-sm text-[#7b5b37]">
                  Réservation en ligne
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <header className="sticky top-0 z-50 border-b border-[#e8d9c4]/60 bg-[#F2E8D9] shadow-[0_14px_45px_rgba(80,55,25,0.08)]">
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-[#d8a646]/45 to-transparent" />

        <div className="mx-auto flex w-[min(1200px,calc(100%-24px))] items-center justify-between gap-3 py-3 md:py-4">
          <motion.a
            href="#top"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="group flex min-w-0 items-center gap-3"
            aria-label="Retour en haut de page"
          >
            <div className="h-14 w-14 shrink-0 flex items-center justify-center overflow-hidden rounded-[22px] border border-[#eadfce] bg-[#f4eadc] shadow-[0_12px_26px_rgba(185,139,61,0.18)]">
              <img src="/icon-192.png" alt={BRAND_NAME} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="truncate text-2xl leading-none tracking-[-0.04em] md:text-3xl">
                <SalonNamePremium name={salonName} compact />
              </div>
              <div className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.26em] text-[#8a7a67] sm:block">
                Salon de coiffure
              </div>
            </div>
          </motion.a>

          <nav className="hidden items-center rounded-full border border-white/55 bg-white/45 px-2 py-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.65),0_10px_30px_rgba(80,55,25,0.06)] backdrop-blur-xl md:flex">
            {[
              ["Prestations", "#prestations"],
              ["À propos", "#apropos"],
              ["Contact", "#contact"],
            ].map(([label, href]) => (
              <a
                key={label}
                href={href}
                className="group relative rounded-full px-4 py-2 text-sm font-semibold text-[#4d4034] transition duration-300 hover:bg-white/70 hover:text-[#9f742f]"
              >
                {label}
                <span className="absolute inset-x-4 -bottom-0.5 h-px scale-x-0 rounded-full bg-gradient-to-r from-[var(--gold)] via-[#f3d27a] to-[#9f742f] transition-transform duration-300 group-hover:scale-x-100" />
              </a>
            ))}

            <a
              href="https://www.instagram.com/coiffure_boucledor?igsh=OHlsbjRkb2c1NDcy"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-[#4d4034] transition duration-300 hover:bg-white/70 hover:text-[#9f742f]"
              aria-label="Instagram Boucle d’Or"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
                <path d="M7.75 2h8.5A5.75 5.75 0 0 1 22 7.75v8.5A5.75 5.75 0 0 1 16.25 22h-8.5A5.75 5.75 0 0 1 2 16.25v-8.5A5.75 5.75 0 0 1 7.75 2Zm0 1.5A4.25 4.25 0 0 0 3.5 7.75v8.5a4.25 4.25 0 0 0 4.25 4.25h8.5a4.25 4.25 0 0 0 4.25-4.25v-8.5A4.25 4.25 0 0 0 16.25 3.5h-8.5ZM17.5 6.25a1 1 0 1 1 0 2 1 1 0 0 1 0-2ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 1.5A3.5 3.5 0 1 0 12 15.5 3.5 3.5 0 0 0 12 8.5Z" />
              </svg>
              Instagram
            </a>
          </nav>

          <div className="hidden items-center gap-2 sm:flex">
            <motion.a
              href="/espace-client"
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full border border-[#1f1b17]/10 bg-white/45 px-4 py-3 text-sm font-semibold text-[#2c241d] shadow-[0_8px_22px_rgba(80,55,25,0.05)] transition hover:bg-white/75"
            >
              Espace client
            </motion.a>
            <motion.a
              href="/reservation"
              whileHover={{ y: -2, scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-[#111111] px-5 py-3 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(17,17,17,0.18)] transition hover:shadow-[0_18px_38px_rgba(17,17,17,0.24)]"
            >
              Prendre RDV
            </motion.a>
          </div>

          <motion.a
            href="/reservation"
            whileTap={{ scale: 0.96 }}
            className="rounded-full bg-[#111111] px-4 py-3 text-sm font-semibold text-white shadow-[0_12px_25px_rgba(17,17,17,0.16)] sm:hidden"
          >
            Prendre RDV
          </motion.a>
        </div>

        <div className="border-t border-white/40 bg-white/20 md:hidden">
          <div className="mx-auto grid w-[min(1200px,calc(100%-24px))] gap-2 py-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <a
                href="/espace-client"
                className="rounded-full border border-white/45 bg-white/55 px-3 py-2 text-center font-semibold text-[#4d4034] transition active:scale-95"
              >
                Espace client
              </a>

              <a
                href="https://www.instagram.com/coiffure_boucledor?igsh=OHlsbjRkb2c1NDcy"
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/45 bg-white/55 px-3 py-2 text-center font-semibold text-[#4d4034] transition active:scale-95"
              >
                Instagram
              </a>
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
                  className="rounded-full border border-white/45 bg-white/40 px-2 py-2 text-center text-[13px] font-medium text-[#4d4034] transition active:scale-95"
                >
                  {label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </header>

      {settings?.promo_text?.trim() ? (
        <div className="relative z-40 bg-[#1f1b17] px-4 py-2.5 text-center text-sm font-medium text-[#f3d27a]">
          {settings.promo_text.trim()}
        </div>
      ) : null}

      <section className="relative z-10 mx-auto grid w-[min(1200px,calc(100%-32px))] gap-6 py-8 lg:grid-cols-[1.05fr_0.95fr]">
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          transition={{ duration: 0.65, ease: "easeOut" }}
          className="relative overflow-hidden rounded-[36px] border border-white/10 bg-[radial-gradient(circle_at_20%_10%,rgba(216,166,70,0.26),transparent_30%),linear-gradient(145deg,#18130f_0%,#0f0f0f_55%,#2a1d12_100%)] p-8 text-white shadow-[0_24px_70px_rgba(72,48,22,0.22)] before:absolute before:right-[-90px] before:top-[-90px] before:h-64 before:w-64 before:rounded-full before:bg-[#d8a646]/20 before:blur-3xl"
        >
          <div className="relative z-10 mb-3 inline-flex rounded-full border border-[#d8a646]/25 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.22em] text-[#f3d27a] backdrop-blur">
            Salon de coiffure
          </div>
          <h1 className="relative z-10 max-w-xl text-5xl leading-[0.95] tracking-[-0.06em] md:text-7xl">
            <SalonNamePremium name={salonName} />
            <br />
            <span className="mt-3 inline-block text-3xl font-light tracking-[-0.03em] text-white/82 md:text-5xl">
              L’élégance au naturel
            </span>
          </h1>
          <p className="relative z-10 mt-6 max-w-xl text-lg text-white/75">
            {salonName}, votre salon de coiffure à taille humaine à Rognac.
            Écoute, conseil et savoir-faire pour sublimer vos cheveux.
          </p>

          <div className="relative z-10 mt-8 flex flex-wrap gap-3">
            <motion.a
              href="/reservation"
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.97 }}
              className="rounded-full bg-[#d8a646] px-6 py-4 font-semibold text-[#111111] shadow-lg shadow-black/20 transition hover:shadow-xl"
            >
              Réserver en ligne
            </motion.a>
            <motion.a
              href="#prestations"
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="rounded-full border border-white/20 px-6 py-4 font-semibold text-white transition hover:bg-white/5"
            >
              Découvrir nos prestations
            </motion.a>
          </div>

          <div className="relative z-10 mt-10 grid gap-4 text-sm text-white/80 md:grid-cols-3">
            <div className="rounded-2xl border border-white/10 p-4">
              Techniques de professionnels
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              Produits de qualité
            </div>
            <div className="rounded-2xl border border-white/10 p-4">
              Ambiance chaleureuse
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.75, ease: "easeOut", delay: 0.15 }}
          className="overflow-hidden rounded-[32px] border border-[#e7ddd0] bg-white shadow-[0_18px_50px_rgba(0,0,0,0.05)]"
        >
          <motion.img
            src="/images/hero-salon.jpg"
            alt={`Salon ${salonName}`}
            className="h-full min-h-[520px] w-full object-cover"
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        </motion.div>
      </section>

      <section
        id="espace-client"
        className="mx-auto w-[min(1200px,calc(100%-32px))] py-2"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="rounded-[28px] border border-[#e7ddd0] bg-white/65 p-6 shadow-sm backdrop-blur"
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            Espace client
          </div>
          <h2 className="text-3xl md:text-4xl">Déjà un rendez-vous ?</h2>
          <p className="mt-3 max-w-2xl text-[#6e655c]">
            Retrouver, modifier ou annuler votre rendez-vous simplement avec
            votre numéro de téléphone.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href="/espace-client"
              className="rounded-full bg-[#111111] px-6 py-4 font-semibold text-white hover:opacity-90"
            >
              Gérer mon rendez-vous
            </a>
            <a
              href="/reservation"
              className="rounded-full border border-black/10 px-6 py-4 font-semibold hover:bg-white"
            >
              Prendre rendez-vous
            </a>
          </div>
        </motion.div>
      </section>

      <section
        id="prestations"
        className="mx-auto w-[min(1200px,calc(100%-32px))] scroll-mt-32 py-10"
      >
        <div className="mb-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            Prestations
          </div>
          <h2 className="text-4xl">Nos prestations</h2>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
          {[
            ["Coupe & brushing", "Coupe sur-mesure, brushing, mise en forme", "À partir de 28€"],
            ["Coloration", "Coloration, mèches, balayage, ombré hair", "À partir de 45€"],
            ["Soins & traitements", "Soins profonds, lissage, botox capillaire", "À partir de 20€"],
            ["Coiffures", "Attaches, chignons, coiffures événementielles", "À partir de 35€"],
          ].map(([title, text, price]) => (
            <motion.article
              key={title}
              variants={fadeUp}
              whileHover={{ y: -6, scale: 1.02 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-[24px] border border-[#e7ddd0] bg-white/65 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-[0_16px_35px_rgba(0,0,0,0.08)]"
            >
              <h3 className="text-2xl">{title}</h3>
              <p className="mt-3 text-[#6e655c]">{text}</p>
              <p className="mt-5 font-semibold text-[var(--gold)]">{price}</p>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section
        id="apropos"
        className="mx-auto grid w-[min(1200px,calc(100%-32px))] scroll-mt-32 gap-6 py-6 lg:grid-cols-[0.9fr_1.1fr]"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="rounded-[28px] border border-[#e7ddd0] bg-white/70 p-6 backdrop-blur"
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            À propos
          </div>
          <h2 className="text-4xl">{salonName}, un salon à taille humaine</h2>
          <p className="mt-4 text-[#6e655c]">
            Chez {salonName}, chaque rendez-vous est pensé comme un vrai moment
            de bien-être. Virginie vous accueille dans une ambiance conviviale,
            avec une attention particulière portée à l’écoute, au conseil et au
            résultat.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 28 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true, amount: 0.25 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-[28px] border border-[#e7ddd0] bg-white p-6"
        >
          <motion.img
            src="/images/apropos-salon.jpg"
            alt={`Espace shampoing du salon ${salonName}`}
            className="h-full min-h-[260px] w-full rounded-[22px] object-cover"
            whileHover={{ scale: 1.02 }}
            transition={{ duration: 0.5, ease: "easeOut" }}
          />
        </motion.div>
      </section>

      <section className="mx-auto w-[min(1200px,calc(100%-32px))] py-10">
        <div className="mb-6">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            Avis clientes
          </div>
          <h2 className="text-4xl">Ce qu’elles pensent du salon</h2>
        </div>

        <motion.div
          variants={staggerContainer}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-4 md:grid-cols-3"
        >
          {[
            [
              "Sophie",
              "Un salon très agréable, Virginie est à l’écoute et le résultat est toujours impeccable. Je recommande sans hésiter.",
            ],
            [
              "Camille",
              "Accueil chaleureux, très bons conseils et prestation de qualité. On se sent vraiment bien du début à la fin.",
            ],
            [
              "Nadia",
              "Je suis ravie de ma coupe et de la couleur. Travail soigné, ambiance conviviale et vraie attention aux détails.",
            ],
          ].map(([name, review]) => (
            <motion.article
              key={name}
              variants={fadeUp}
              whileHover={{ y: -5 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="rounded-[24px] border border-[#e7ddd0] bg-white/65 p-6 shadow-sm backdrop-blur transition-shadow hover:shadow-[0_14px_30px_rgba(0,0,0,0.07)]"
            >
              <div className="mb-4 flex items-center gap-1 text-[#d8a646]">
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
                <span>★</span>
              </div>

              <p className="text-[#6e655c]">“{review}”</p>

              <div className="mt-5 font-semibold text-[#1f1b17]">{name}</div>
            </motion.article>
          ))}
        </motion.div>
      </section>

      <section
        id="contact"
        className="mx-auto w-[min(1200px,calc(100%-32px))] scroll-mt-32 py-10 pb-20"
      >
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="rounded-[30px] bg-[#111111] p-8 text-white"
        >
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[#d8a646]">
            Contact
          </div>
          <h2 className="text-4xl">Prendre contact avec le salon</h2>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[20px] border border-white/10 p-5">
              <strong>Adresse</strong>
              <p className="mt-2 whitespace-pre-line text-white/75">
                {salonAddress}
              </p>
            </div>

            <div className="rounded-[20px] border border-white/10 p-5">
              <strong>Téléphone</strong>
              <p className="mt-2 text-white/75">{salonPhone}</p>
            </div>

            <div className="rounded-[20px] border border-white/10 p-5">
              <strong>Horaires</strong>

              <div className="mt-3 grid gap-2 text-white/75">
                <div className="flex justify-between gap-4">
                  <span>Lundi</span>
                  <span>
                    {settings?.is_open_monday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Mardi</span>
                  <span>
                    {settings?.is_open_tuesday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Mercredi</span>
                  <span>
                    {settings?.is_open_wednesday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Jeudi</span>
                  <span>
                    {settings?.is_open_thursday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Vendredi</span>
                  <span>
                    {settings?.is_open_friday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Samedi</span>
                  <span>
                    {settings?.is_open_saturday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>

                <div className="flex justify-between gap-4">
                  <span>Dimanche</span>
                  <span>
                    {settings?.is_open_sunday
                      ? `${openingTime} à ${closingTime}`
                      : "Fermé"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <a
              href={formatPhoneHref(salonPhone)}
              className="rounded-full bg-[#d8a646] px-6 py-4 font-semibold text-[#111111]"
            >
              Appeler le salon
            </a>
            <a
              href="/reservation"
              className="rounded-full border border-white/15 px-6 py-4 font-semibold text-white"
            >
              Réserver en ligne
            </a>
          </div>
        </motion.div>
      </section>

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
