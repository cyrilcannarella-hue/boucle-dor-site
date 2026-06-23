"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { useMemo, useState } from "react";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, getPatternBgLayer } from "@/components/SitePattern";

type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  source: "web" | "salon";
  price_cents: number;
  client_message: string | null;
  staff_id?: string | null;
  staff?: { first_name: string; last_name: string } | null;
  services: {
    id: string;
    name: string;
    duration_minutes: number;
    categories: {
      name: string;
    } | null;
  } | null;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
  } | null;
};

export type SalonSettings = {
  id: string;
  salon_name: string;
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
  phone?: string | null;
  color_page_bg?: string | null;
  color_header_bg?: string | null;
  color_text_main?: string | null;
  color_salon_name?: string | null;
  color_text_secondary?: string | null;
  color_card_border?: string | null;
  color_accents?: string | null;
  color_nav_text?: string | null;
  logo_image_url?: string | null;
  site_font?: string | null;
  font_salon_name?: string | null;
  bg_pattern?: string | null;
};

function hexToRgb(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `${r},${g},${b}`;
}

function derivePanelBg(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const offset = 20;
  const clamp = (v: number) => Math.max(0, Math.min(255, v + offset));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.40 ? "#111827" : "#ffffff";
}

function formatFrenchDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  return date.toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatFrenchTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

const WEEK_DAYS: [string, keyof SalonSettings, keyof SalonSettings, keyof SalonSettings][] = [
  ["Lundi", "is_open_monday", "opening_time_monday", "closing_time_monday"],
  ["Mardi", "is_open_tuesday", "opening_time_tuesday", "closing_time_tuesday"],
  ["Mercredi", "is_open_wednesday", "opening_time_wednesday", "closing_time_wednesday"],
  ["Jeudi", "is_open_thursday", "opening_time_thursday", "closing_time_thursday"],
  ["Vendredi", "is_open_friday", "opening_time_friday", "closing_time_friday"],
  ["Samedi", "is_open_saturday", "opening_time_saturday", "closing_time_saturday"],
  ["Dimanche", "is_open_sunday", "opening_time_sunday", "closing_time_sunday"],
];

function formatPrice(priceCents: number) {
  return `${(priceCents / 100).toFixed(2).replace(".00", "")} €`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

export function EspaceClientPageClient({ initialSettings }: { initialSettings: SalonSettings | null }) {
  const settings = initialSettings;
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);

  const loadAppointmentsByPhone = async (phoneValue: string) => {
    const digitsOnly = normalizePhone(phoneValue);

    const res = await fetch("/api/espace-client/lookup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: digitsOnly }),
    });
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? "Impossible de retrouver le rendez-vous.");
    }

    return (json.appointments ?? []) as unknown as AppointmentRow[];
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();

    const digitsOnly = normalizePhone(phone);

    if (digitsOnly.length !== 10) {
      setStatus("Le numéro de téléphone doit contenir exactement 10 chiffres.");
      setAppointments([]);
      return;
    }

    try {
      setLoading(true);
      setStatus("");

      const typedAppointments = await loadAppointmentsByPhone(phone);

      if (typedAppointments.length === 0) {
        setAppointments([]);
        setStatus("Aucun rendez-vous trouvé avec ce numéro.");
        return;
      }

      setAppointments(typedAppointments);
      setStatus("Rendez-vous retrouvé(s) ✅");
    } catch (error: unknown) {
      setAppointments([]);
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible de retrouver le rendez-vous."}`,
      );
    } finally {
      setLoading(false);
    }
  };

  const visibleAppointments = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return appointments.filter((appointment) => {
      if (appointment.status === "cancelled") return false;
      return appointment.appointment_date >= todayKey;
    });
  }, [appointments]);

  const colorButtons = settings?.color_accents || "#4f46e5";
  const colorButtonsText = contrastText(colorButtons);
  const colorPageBg = settings?.color_page_bg || "#ffffff";
  const colorPanelBg = derivePanelBg(colorPageBg);
  const bgPatternLayer = getPatternBgLayer(settings?.bg_pattern, colorPageBg);
  const colorHeaderBg = settings?.color_header_bg || "#ffffff";
  const colorTextMain = settings?.color_text_main || "#111827";
  const colorSalonName = settings?.color_salon_name || colorTextMain;
  const colorTextSecondary = settings?.color_text_secondary || "#6b7280";
  const colorCardBorder = settings?.color_card_border || "#e5e7eb";
  const colorAccents = settings?.color_accents || "#4f46e5";
  const colorNavText = settings?.color_nav_text || "#111827";
  const logoUrl = settings?.logo_image_url || null;
  const salonName = (settings?.salon_name || "Votre salon").replace(/['‘’‛]/g, "'");

  return (
    <main
      className="relative min-h-screen"
      style={{ color: colorTextMain, background: `${bgPatternLayer ? bgPatternLayer + "," : ""}radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.24), transparent 34%), ${colorPageBg}` }}
    >
      <SiteFont font={settings?.site_font} salonNameFont={settings?.font_salon_name} />
      <SitePattern pattern={settings?.bg_pattern} />
      <style>{`
        :root {
          --gold: ${colorAccents};
          --text-secondary: ${colorTextSecondary};
          --card-border: ${colorCardBorder};
          --nav-text: ${colorNavText};
          --text-main: ${colorTextMain};
          --accents: ${colorAccents};
          --page-bg: ${colorPageBg};
          --panel-bg: ${colorPanelBg};
        }
      `}</style>
      <div className="pointer-events-none fixed -left-28 top-16 h-56 w-56 sm:h-72 sm:w-72 rounded-full bg-[var(--accents)]/20 blur-3xl" />
      <div className="pointer-events-none fixed -right-32 top-72 h-56 w-56 sm:h-80 sm:w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />
      <header
        className="sticky top-0 z-40 shadow-[0_14px_45px_rgba(80,55,25,0.10)] backdrop-blur-md"
        style={{ borderBottom: `1px solid ${colorCardBorder}88`, background: `linear-gradient(to bottom, ${colorHeaderBg}d8, ${colorHeaderBg}f4)` }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}99, transparent)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 130%, ${colorAccents}28, transparent 55%)` }} />
          <div className="header-sweep absolute inset-y-0 w-1/3" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}28, transparent)` }} />
        </div>
        <div className="mx-auto flex w-[min(1200px,calc(100%-20px))] items-center justify-between gap-2 py-2.5 sm:w-[min(1200px,calc(100%-28px))] sm:gap-4 sm:py-3">
          <Link href="/" className="group flex min-w-0 items-center gap-2 sm:gap-3">
            {logoUrl && (
              <div className="h-11 w-11 shrink-0 flex items-center justify-center overflow-hidden rounded-[18px] border border-[var(--card-border)] bg-[var(--page-bg)] shadow-[0_12px_26px_rgba(185,139,61,0.18)] sm:h-14 sm:w-14 sm:rounded-[22px]">
                <img src={logoUrl} alt={salonName} className="h-full w-full object-cover" />
              </div>
            )}
            <span>
              <span className="block text-xl leading-none tracking-tight sm:text-3xl">
                <SalonNameGradient name={salonName} goldColor={colorSalonName} />
              </span>
              <span className="mt-1 hidden text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)] sm:block">
                Mes réservations
              </span>
            </span>
          </Link>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <Link
              href="/"
              className="rounded-full border border-[var(--card-border)]/70 bg-[var(--panel-bg)] px-3 py-2 text-xs sm:px-4 sm:text-sm font-semibold text-[var(--nav-text)] transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)] hover:shadow-[0_10px_24px_rgba(80,56,32,0.08)]"
            >
              Accueil
            </Link>
            <Link
              href="/reservation"
              className="hidden btn-shimmer rounded-full px-4 py-3 text-sm font-semibold transition sm:inline-flex"
              style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 14px 30px rgba(17,17,17,0.18), 0 0 28px 6px ${colorButtons}b3` }}
            >
              Réserver
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-[min(1200px,calc(100%-20px))] gap-4 py-4 sm:w-[min(1200px,calc(100%-28px))] sm:gap-6 sm:py-10 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="contents lg:grid lg:gap-5">
          <div className="order-1 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 sm:rounded-[30px] sm:p-6 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6 lg:order-none">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Recherche
            </div>
            <h2 className="text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              Retrouvez votre rendez-vous
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Entrez le numéro utilisé lors de la réservation pour consulter
              votre rendez-vous.
            </p>

            <form onSubmit={handleSearch} className="mt-5 grid gap-3 sm:gap-4">
              <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                Téléphone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  className="min-h-[48px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[#d4af37]/15"
                />
              </label>

              <button
                type="submit"
                disabled={loading}
                className="min-h-[48px] rounded-2xl px-5 py-3 font-semibold transition hover:-translate-y-0.5 disabled:opacity-50"
                style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 10px 24px rgba(60,40,20,0.16), 0 0 28px 6px ${colorButtons}b3` }}
              >
                {loading ? "Recherche..." : "Retrouvez votre rendez-vous"}
              </button>
            </form>

            {status ? (
              <div className="mt-4 rounded-[16px] border border-[#c7e0ce] bg-[#f5fbf6] px-4 py-3 text-sm text-[#1f6a3a]">
                {status}
              </div>
            ) : null}
          </div>

          <div className="order-3 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 sm:rounded-[30px] sm:p-6 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6 lg:order-none">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Information
            </div>
            <h2 className="text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              {settings?.salon_name || "Votre salon"}
            </h2>

            <div className="mt-5 grid gap-3">
              <div className="grid gap-1 border-b sm:flex sm:justify-between sm:gap-4 border-[var(--card-border)] pb-3 text-[var(--text-secondary)]">
                <strong className="text-[var(--text-main)]">Téléphone salon</strong>
                <a href={`tel:${(settings?.phone || "0986678830").replace(/\s+/g, "")}`} className="underline decoration-[var(--gold)] underline-offset-4">
                  {settings?.phone || "09 86 67 88 30"}
                </a>
              </div>
              <div className="grid gap-2 text-[var(--text-secondary)]">
                <strong className="text-[var(--text-main)]">Horaires</strong>
                {WEEK_DAYS.map(([label, openKey, openTimeKey, closeTimeKey]) => {
                  const isOpen = settings?.[openKey];
                  const open = (settings?.[openTimeKey] as string | null | undefined)?.slice(0, 5) || settings?.opening_time?.slice(0, 5) || "09:00";
                  const close = (settings?.[closeTimeKey] as string | null | undefined)?.slice(0, 5) || settings?.closing_time?.slice(0, 5) || "19:00";
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
        </aside>

        <section className="order-2 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 sm:rounded-[30px] sm:p-6 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6 lg:order-none">
          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Résultats
              </div>
              <h2 className="text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-3xl">
                Mes rendez-vous
              </h2>
            </div>
          </div>

          {visibleAppointments.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-8 sm:px-6 sm:py-10 text-center text-[var(--text-secondary)]">
              Aucun rendez-vous à venir affiché pour le moment.
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleAppointments.map((appointment) => (
                <article
                  key={appointment.id}
                  className="rounded-[22px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 shadow-sm sm:rounded-[24px] sm:p-5"
                >
                  <div className="mb-4 grid gap-3 sm:flex sm:flex-wrap sm:items-start sm:justify-between">
                    <div>
                      <h3 className="text-xl leading-tight sm:text-2xl">
                        {appointment.services?.name ?? "Prestation"}
                      </h3>
                      <p className="mt-1 text-[var(--text-secondary)]">
                        {appointment.services?.categories?.name ??
                          "Sans catégorie"}{" "}
                        • {appointment.services?.duration_minutes ?? "--"} min
                      </p>
                    </div>

                    <span className="w-fit rounded-full bg-[var(--page-bg)] px-3 py-2 text-sm font-semibold text-[var(--gold)]">
                      {formatPrice(appointment.price_cents)}
                    </span>
                  </div>

                  <div className="grid gap-2.5 sm:gap-3 md:grid-cols-2">
                    <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--page-bg)] p-3.5 sm:rounded-[18px] sm:p-4">
                      <strong>Cliente / client</strong>
                      <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                        {appointment.clients?.first_name}{" "}
                        {appointment.clients?.last_name}
                      </span>
                    </div>

                    <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--page-bg)] p-3.5 sm:rounded-[18px] sm:p-4">
                      <strong>Téléphone</strong>
                      <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                        {appointment.clients?.phone}
                      </span>
                    </div>

                    <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--page-bg)] p-3.5 sm:rounded-[18px] sm:p-4">
                      <strong>Date</strong>
                      <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                        {formatFrenchDate(appointment.appointment_date)}
                      </span>
                    </div>

                    <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--page-bg)] p-3.5 sm:rounded-[18px] sm:p-4">
                      <strong>Heure</strong>
                      <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                        {formatFrenchTime(appointment.start_time)} →{" "}
                        {formatFrenchTime(appointment.end_time)}
                      </span>
                    </div>

                    <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--page-bg)] p-3.5 sm:rounded-[18px] sm:p-4">
                      <strong>Statut</strong>
                      <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                        {appointment.status === "confirmed" ? "Confirmé" : appointment.status === "completed" ? "Terminé" : "Annulé"}
                      </span>
                    </div>

                    {appointment.staff ? (
                      <div className="rounded-[16px] border border-[var(--card-border)] bg-[var(--page-bg)] p-3.5 sm:rounded-[18px] sm:p-4">
                        <strong>Prestataire</strong>
                        <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                          {appointment.staff.first_name}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {appointment.client_message ? (
                    <div className="mt-4 rounded-[18px] border border-[var(--card-border)] bg-[var(--page-bg)] p-4">
                      <strong>Message laissé au salon</strong>
                      <p className="mt-2 text-sm text-[var(--text-secondary)]">
                        {appointment.client_message}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-4 grid gap-2.5 sm:flex sm:flex-wrap sm:gap-3">
                    <a
                      href={`tel:${(settings?.phone || "0986678830").replace(/\s+/g, "")}`}
                      className="min-h-[48px] rounded-full px-5 py-3 text-center font-medium hover:opacity-90"
                      style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 0 28px 6px ${colorButtons}b3` }}
                    >
                      Appeler le salon pour modifier ou annuler
                    </a>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
