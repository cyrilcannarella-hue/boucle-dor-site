"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { useEffect, useMemo, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { useSalon } from "@/hooks/useSalon";
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

type BusyRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
};

type ExceptionClosure = {
  id: string;
  closure_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  reason: string | null;
};

type Slot = {
  label: string;
  available: boolean;
};

type SalonSettings = {
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

const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const dayNamesFull = [
  "dimanche",
  "lundi",
  "mardi",
  "mercredi",
  "jeudi",
  "vendredi",
  "samedi",
];
const monthNames = [
  "janvier",
  "février",
  "mars",
  "avril",
  "mai",
  "juin",
  "juillet",
  "août",
  "septembre",
  "octobre",
  "novembre",
  "décembre",
];

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

function formatOpenDays(settings: SalonSettings | null) {
  if (!settings) return "Chargement...";

  const days = [
    { name: "lundi", open: settings.is_open_monday },
    { name: "mardi", open: settings.is_open_tuesday },
    { name: "mercredi", open: settings.is_open_wednesday },
    { name: "jeudi", open: settings.is_open_thursday },
    { name: "vendredi", open: settings.is_open_friday },
    { name: "samedi", open: settings.is_open_saturday },
    { name: "dimanche", open: settings.is_open_sunday },
  ];

  const openIndexes = days
    .map((day, index) => (day.open ? index : -1))
    .filter((index) => index !== -1);

  if (openIndexes.length === 0) return "Fermé";

  const ranges: string[] = [];
  let start = openIndexes[0];
  let previous = openIndexes[0];

  for (let i = 1; i <= openIndexes.length; i++) {
    const current = openIndexes[i];

    if (current !== previous + 1) {
      const startName = days[start].name;
      const endName = days[previous].name;
      ranges.push(
        startName === endName ? startName : `${startName} à ${endName}`,
      );
      start = current;
    }

    previous = current;
  }

  if (ranges.length === 1) return ranges[0];
  return `${ranges.slice(0, -1).join(", ")} et ${ranges[ranges.length - 1]}`;
}

function formatPrice(priceCents: number) {
  return `${(priceCents / 100).toFixed(2).replace(".00", "")} €`;
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function makeLocalDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function parseTime(str: string) {
  const clean = str.slice(0, 5);
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + m;
}

function formatTime(min: number) {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

function formatPgTimeFromLabel(str: string) {
  return `${str}:00`;
}

function formatDateLabel(date: Date) {
  return `${dayNamesFull[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function getNext30Days() {
  const arr: Date[] = [];
  const now = new Date();
  const today = makeLocalDate(now.getFullYear(), now.getMonth(), now.getDate());

  for (let i = 0; i < 30; i++) {
    arr.push(
      makeLocalDate(today.getFullYear(), today.getMonth(), today.getDate() + i),
    );
  }

  return arr;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function getAllSlots(
  duration: number,
  openingMinutes: number,
  closingMinutes: number,
) {
  const slots: Slot[] = [];
  for (let t = openingMinutes; t <= closingMinutes - duration; t += 15) {
    slots.push({ label: formatTime(t), available: true });
  }
  return slots;
}

function isOpenDayFromSettings(date: Date, settings: SalonSettings | null) {
  if (!settings) return false;

  const day = date.getDay();

  if (day === 1) return settings.is_open_monday;
  if (day === 2) return settings.is_open_tuesday;
  if (day === 3) return settings.is_open_wednesday;
  if (day === 4) return settings.is_open_thursday;
  if (day === 5) return settings.is_open_friday;
  if (day === 6) return settings.is_open_saturday;
  return settings.is_open_sunday;
}

function isBlockedByExceptionalClosure(
  slotStart: number,
  slotEnd: number,
  closures: ExceptionClosure[],
) {
  return closures.some((closure) => {
    if (closure.is_all_day) return true;
    if (!closure.start_time || !closure.end_time) return false;

    const closureStart = parseTime(closure.start_time);
    const closureEnd = parseTime(closure.end_time);

    return overlaps(slotStart, slotEnd, closureStart, closureEnd);
  });
}

export default function EspaceClientPage() {
  const { id: salonId } = useSalon();
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [confirmCancelId, setConfirmCancelId] = useState<string | null>(null);

  const [editingAppointment, setEditingAppointment] =
    useState<AppointmentRow | null>(null);
  const [selectedDateKey, setSelectedDateKey] = useState("");
  const [selectedTime, setSelectedTime] = useState("--:--");
  const [savingEdit, setSavingEdit] = useState(false);
  const [busyRows, setBusyRows] = useState<BusyRow[]>([]);
  const [exceptionClosures, setExceptionClosures] = useState<
    ExceptionClosure[]
  >([]);
  const [settings, setSettings] = useState<SalonSettings | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem("bo_settings_cache");
      if (c) setSettings(JSON.parse(c));
    } catch {}
  }, []);

  const next30Days = useMemo(() => getNext30Days(), []);
  const openingMinutes = useMemo(
    () => parseTime(settings?.opening_time?.slice(0, 5) || "09:00"),
    [settings],
  );
  const closingMinutes = useMemo(
    () => parseTime(settings?.closing_time?.slice(0, 5) || "19:00"),
    [settings],
  );

  useEffect(() => {
    const loadSettings = async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("salon_settings")
        .select("*")
        .eq("salon_id", salonId)
        .limit(1)
        .maybeSingle();

      setSettings((data ?? null) as SalonSettings | null);
      if (data) { try { localStorage.setItem("bo_settings_cache", JSON.stringify(data)); } catch {} }
    };

    loadSettings();
  }, [salonId]);

  useEffect(() => {
    if (editingAppointment) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }

    return () => {
      document.body.style.overflow = "";
    };
  }, [editingAppointment]);

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

  const loadBusyRowsForDay = async (
    appointmentDate: string,
    appointmentIdToIgnore?: string,
  ) => {
    const res = await fetch(`/api/public/busy-appointments?date=${appointmentDate}`);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? "Impossible de charger les créneaux.");
    }

    const rows = ((json.appointments ?? []) as BusyRow[]).filter(
      (item) => item.id !== appointmentIdToIgnore,
    );
    setBusyRows(rows);
    return rows;
  };

  const loadClosuresForDay = async (appointmentDate: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("exception_closures")
      .select("id, closure_date, start_time, end_time, is_all_day, reason")
      .eq("salon_id", salonId)
      .eq("closure_date", appointmentDate)
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error((error as Error).message);
    }

    const rows = (data ?? []) as ExceptionClosure[];
    setExceptionClosures(rows);
    return rows;
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

  const handleCancelAppointment = async (appointmentId: string) => {
    try {
      setCancellingId(appointmentId);
      setStatus("");

      const res = await fetch("/api/espace-client/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizePhone(phone), appointmentId }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Impossible d'annuler le rendez-vous.");
      }

      setAppointments((prev) => prev.filter((a) => a.id !== appointmentId));
      setStatus("Rendez-vous annulé ✅");
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible d'annuler le rendez-vous."}`,
      );
    } finally {
      setCancellingId(null);
    }
  };

  const openEdit = async (appointment: AppointmentRow) => {
    try {
      setEditingAppointment(appointment);
      setSelectedDateKey(appointment.appointment_date);
      setSelectedTime(formatFrenchTime(appointment.start_time));
      setStatus("");

      await Promise.all([
        loadBusyRowsForDay(appointment.appointment_date, appointment.id),
        loadClosuresForDay(appointment.appointment_date),
      ]);
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible de préparer la modification."}`,
      );
    }
  };

  const closeEdit = () => {
    setEditingAppointment(null);
    setSelectedDateKey("");
    setSelectedTime("--:--");
    setBusyRows([]);
    setExceptionClosures([]);
  };

  const currentSlots = useMemo(() => {
    const duration = editingAppointment?.services?.duration_minutes ?? 30;
    const allSlots = getAllSlots(duration, openingMinutes, closingMinutes);

    return allSlots.map((slot) => {
      const slotStart = parseTime(slot.label);
      const slotEnd = slotStart + duration;

      const blockedByBusy = busyRows.some((row) => {
        const existingStart = parseTime(row.start_time);
        const existingEnd = parseTime(row.end_time);
        return overlaps(slotStart, slotEnd, existingStart, existingEnd);
      });

      const blockedByClosures = isBlockedByExceptionalClosure(
        slotStart,
        slotEnd,
        exceptionClosures,
      );

      return {
        ...slot,
        available: !blockedByBusy && !blockedByClosures,
      };
    });
  }, [
    editingAppointment,
    busyRows,
    exceptionClosures,
    openingMinutes,
    closingMinutes,
  ]);

  const dayHasAllDayClosure = useMemo(() => {
    return exceptionClosures.some((closure) => closure.is_all_day);
  }, [exceptionClosures]);

  const visibleAppointments = useMemo(() => {
    const now = new Date();
    const todayKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    return appointments.filter((appointment) => {
      if (appointment.status === "cancelled") return false;
      return appointment.appointment_date >= todayKey;
    });
  }, [appointments]);

  const handleSelectDate = async (date: Date) => {
    const key = toKey(date);
    setSelectedDateKey(key);

    if (!editingAppointment) return;

    try {
      const [rows, closures] = await Promise.all([
        loadBusyRowsForDay(key, editingAppointment.id),
        loadClosuresForDay(key),
      ]);

      const duration = editingAppointment.services?.duration_minutes ?? 30;
      const allSlots = getAllSlots(duration, openingMinutes, closingMinutes);

      const firstAvailable = allSlots.find((slot) => {
        const slotStart = parseTime(slot.label);
        const slotEnd = slotStart + duration;

        const blockedByBusy = rows.some((row) => {
          const existingStart = parseTime(row.start_time);
          const existingEnd = parseTime(row.end_time);
          return overlaps(slotStart, slotEnd, existingStart, existingEnd);
        });

        const blockedByClosures = isBlockedByExceptionalClosure(
          slotStart,
          slotEnd,
          closures,
        );

        return !blockedByBusy && !blockedByClosures;
      });

      setSelectedTime(firstAvailable ? firstAvailable.label : "--:--");
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible de charger les créneaux."}`,
      );
    }
  };

  const handleSaveEdit = async () => {
    if (!editingAppointment) return;

    if (!selectedDateKey || selectedTime === "--:--") {
      setStatus(
        "Choisis une date et un créneau disponibles pour modifier le rendez-vous.",
      );
      return;
    }

    const selectedDate = makeLocalDate(
      Number(selectedDateKey.split("-")[0]),
      Number(selectedDateKey.split("-")[1]) - 1,
      Number(selectedDateKey.split("-")[2]),
    );

    if (!isOpenDayFromSettings(selectedDate, settings)) {
      setStatus("Le salon est fermé ce jour-là.");
      return;
    }

    try {
      setSavingEdit(true);
      setStatus("");

      const duration = editingAppointment.services?.duration_minutes ?? 30;
      const startMinutes = parseTime(selectedTime);
      const endMinutes = startMinutes + duration;

      if (endMinutes > closingMinutes) {
        setStatus("Ce créneau dépasse l’horaire de fermeture.");
        setSavingEdit(false);
        return;
      }

      const [rows, closures] = await Promise.all([
        loadBusyRowsForDay(selectedDateKey, editingAppointment.id),
        loadClosuresForDay(selectedDateKey),
      ]);

      const blockedByBusy = rows.some((row) => {
        const existingStart = parseTime(row.start_time);
        const existingEnd = parseTime(row.end_time);
        return overlaps(startMinutes, endMinutes, existingStart, existingEnd);
      });

      const blockedByClosures = isBlockedByExceptionalClosure(
        startMinutes,
        endMinutes,
        closures,
      );

      if (blockedByBusy || blockedByClosures) {
        setStatus("Ce créneau est indisponible. Choisis-en un autre.");
        setSavingEdit(false);
        return;
      }

      const startTime = formatPgTimeFromLabel(selectedTime);
      const endTime = formatPgTimeFromLabel(formatTime(endMinutes));

      const res = await fetch("/api/espace-client/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizePhone(phone),
          appointmentId: editingAppointment.id,
          appointmentDate: selectedDateKey,
          startTime,
          endTime,
        }),
      });
      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de modifier le rendez-vous.");
      }

      const refreshedAppointments = await loadAppointmentsByPhone(phone);
      setAppointments(refreshedAppointments);
      setStatus("Rendez-vous modifié ✅");
      closeEdit();
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible de modifier le rendez-vous."}`,
      );
    } finally {
      setSavingEdit(false);
    }
  };

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
              className="rounded-full border border-[var(--card-border)]/70 bg-[var(--panel-bg)]/50 px-3 py-2 text-xs sm:px-4 sm:text-sm font-semibold text-[var(--nav-text)] transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)] hover:shadow-[0_10px_24px_rgba(80,56,32,0.08)]"
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
          <div className="order-1 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)]/62 p-4 sm:rounded-[30px] sm:p-6 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6 lg:order-none">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Recherche
            </div>
            <h2 className="text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              Retrouvez votre rendez-vous
            </h2>
            <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
              Entrez le numéro utilisé lors de la réservation pour consulter,
              modifier ou annuler votre rendez-vous.
            </p>

            <form onSubmit={handleSearch} className="mt-5 grid gap-3 sm:gap-4">
              <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                Téléphone
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="06 00 00 00 00"
                  className="min-h-[48px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)]/80 px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition placeholder:text-[var(--text-secondary)] focus:border-[var(--gold)] focus:ring-4 focus:ring-[#d4af37]/15"
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

          <div className="order-3 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)]/62 p-4 sm:rounded-[30px] sm:p-6 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6 lg:order-none">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Information
            </div>
            <h2 className="text-[1.55rem] font-semibold leading-tight tracking-tight sm:text-3xl">
              {settings?.salon_name || "Votre salon"}
            </h2>

            <div className="mt-5 grid gap-3">
              <div className="grid gap-1 border-b sm:flex sm:justify-between sm:gap-4 border-[var(--card-border)] pb-3 text-[var(--text-secondary)]">
                <strong className="text-[var(--text-main)]">Téléphone salon</strong>
                <span>{settings?.phone || "09 86 67 88 30"}</span>
              </div>
              <div className="grid gap-1 border-b sm:flex sm:justify-between sm:gap-4 border-[var(--card-border)] pb-3 text-[var(--text-secondary)]">
                <strong className="text-[var(--text-main)]">Horaires</strong>
                <span>
                  {settings?.opening_time?.slice(0, 5) || "09:00"} à{" "}
                  {settings?.closing_time?.slice(0, 5) || "19:00"}
                </span>
              </div>
              <div className="grid gap-1 text-[var(--text-secondary)] sm:flex sm:justify-between sm:gap-4">
                <strong className="text-[var(--text-main)]">Jours ouverts</strong>
                <span>{formatOpenDays(settings)}</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="order-2 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)]/62 p-4 sm:rounded-[30px] sm:p-6 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6 lg:order-none">
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
                  className="rounded-[22px] border border-[var(--card-border)] bg-[var(--panel-bg)]/86 p-4 shadow-sm sm:rounded-[24px] sm:p-5"
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
                      className="min-h-[48px] rounded-full border border-black/10 px-5 py-3 text-center font-medium hover:bg-[var(--page-bg)]"
                    >
                      Appeler le salon
                    </a>

                    <button
                      type="button"
                      onClick={() => openEdit(appointment)}
                      className="min-h-[48px] rounded-full border border-black/10 px-5 py-3 text-center font-medium hover:bg-[var(--page-bg)]"
                    >
                      Modifier le rendez-vous
                    </button>

                    {confirmCancelId === appointment.id ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-full border border-[#efc9c9] bg-[#fff1f1] px-4 py-2">
                        <span className="text-sm font-medium text-[#a33a3a]">Confirmer l'annulation ?</span>
                        <button
                          type="button"
                          onClick={() => {
                            setConfirmCancelId(null);
                            void handleCancelAppointment(appointment.id);
                          }}
                          disabled={cancellingId === appointment.id}
                          className="rounded-full bg-[#a33a3a] px-4 py-1.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {cancellingId === appointment.id ? "Annulation..." : "Oui, annuler"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancelId(null)}
                          className="rounded-full border border-black/10 px-4 py-1.5 text-sm font-medium hover:bg-[var(--panel-bg)]"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmCancelId(appointment.id)}
                        className="min-h-[48px] rounded-full px-5 py-3 font-medium hover:opacity-90"
                        style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 0 28px 6px ${colorButtons}b3` }}
                      >
                        Annuler le rendez-vous
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </section>

      {editingAppointment ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black/40 p-3 sm:p-5 backdrop-blur-sm">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-4xl rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)]/90 p-4 sm:rounded-[30px] sm:p-8 shadow-[0_24px_70px_rgba(0,0,0,0.14)] backdrop-blur-xl">
              <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Modifier le rendez-vous
              </div>
              <h2 className="text-2xl leading-tight sm:text-4xl">
                Choisissez une nouvelle date et un nouveau créneau
              </h2>
              <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)] sm:text-base">
                {editingAppointment.services?.name ?? "Prestation"} •{" "}
                {editingAppointment.services?.duration_minutes ?? "--"} min
              </p>

              {dayHasAllDayClosure ? (
                <div className="mt-4 rounded-[16px] border border-[#efc9c9] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33a3a]">
                  Fermeture exceptionnelle toute la journée sur cette date.
                </div>
              ) : null}

              <div className="mt-6">
                <div className="mb-2 grid grid-cols-7 gap-1.5 sm:mb-3 sm:gap-2">
                  {dayNames.map((name) => (
                    <div
                      key={name}
                      className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                    >
                      {name}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {(() => {
                    const first = next30Days[0];
                    const startPadding = (first.getDay() + 6) % 7;

                    return (
                      <>
                        {Array.from({ length: startPadding }).map(
                          (_, index) => (
                            <div
                              key={`pad-${index}`}
                              className="min-h-[48px] rounded-[14px] bg-[var(--page-bg)] opacity-40 sm:min-h-[68px] sm:rounded-[16px]"
                            />
                          ),
                        )}

                        {next30Days.map((date) => {
                          const key = toKey(date);
                          const closed = !isOpenDayFromSettings(date, settings);
                          const active = selectedDateKey === key;

                          return (
                            <button
                              key={key}
                              type="button"
                              disabled={closed}
                              onClick={() => handleSelectDate(date)}
                              className={`min-h-[48px] rounded-[14px] border p-1.5 text-left transition sm:min-h-[68px] sm:rounded-[16px] sm:p-2 ${
                                closed
                                  ? "cursor-not-allowed border-[var(--card-border)] bg-[var(--page-bg)] text-[var(--text-secondary)]"
                                  : active
                                    ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[inset_0_0_0_1px_var(--gold)]"
                                    : "border-[var(--card-border)] bg-[var(--panel-bg)] hover:-translate-y-[1px]"
                              }`}
                            >
                              <div className="font-bold">{date.getDate()}</div>
                            </button>
                          );
                        })}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-2 sm:mt-6 sm:gap-3 md:grid-cols-5">
                {currentSlots.map((slot) => (
                  <button
                    key={slot.label}
                    type="button"
                    disabled={!selectedDateKey || !slot.available}
                    onClick={() => setSelectedTime(slot.label)}
                    className={`min-h-[48px] rounded-[16px] border px-3 py-3 text-center font-semibold ${
                      selectedTime === slot.label
                        ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[inset_0_0_0_1px_var(--gold)]"
                        : "border-[var(--card-border)] bg-[var(--panel-bg)]"
                    } ${!selectedDateKey || !slot.available ? "cursor-not-allowed opacity-40" : ""}`}
                  >
                    {slot.label}
                  </button>
                ))}
              </div>

              <div className="mt-5 rounded-[20px] border border-[var(--card-border)] bg-[var(--page-bg)] p-4 sm:mt-6 sm:p-5">
                <strong>Nouveau rendez-vous</strong>
                <p className="mt-1 text-sm text-[var(--text-secondary)]">
                  {selectedDateKey
                    ? `${formatDateLabel(
                        makeLocalDate(
                          Number(selectedDateKey.split("-")[0]),
                          Number(selectedDateKey.split("-")[1]) - 1,
                          Number(selectedDateKey.split("-")[2]),
                        ),
                      )} • ${selectedTime}`
                    : "Choisissez une date"}
                </p>
              </div>

              <div className="mt-6 flex flex-wrap justify-end gap-3">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="min-h-[48px] rounded-full border border-black/10 px-5 py-3 font-medium hover:bg-[var(--panel-bg)]"
                >
                  Fermer
                </button>
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  disabled={savingEdit}
                  className="min-h-[48px] rounded-full px-5 py-3 font-medium hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 0 28px 6px ${colorButtons}b3` }}
                >
                  {savingEdit
                    ? "Enregistrement..."
                    : "Confirmer la modification"}
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
