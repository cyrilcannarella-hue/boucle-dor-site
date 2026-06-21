"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, getPatternBgLayer } from "@/components/SitePattern";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { useSalon } from "@/hooks/useSalon";

type RealtimePayload = {
  new?: { appointment_date?: string };
  old?: { appointment_date?: string };
};

type AppointmentRow = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  status: "confirmed" | "cancelled" | "completed";
  source: "web" | "salon";
  price_cents: number;
  client_message: string | null;
  internal_note: string | null;
  client_id?: string | null;
  service_id?: string | null;
  staff_id?: string | null;
  services: {
    id: string;
    name: string;
    duration_minutes: number;
    duration_before_break?: number | null;
    break_duration?: number | null;
    duration_after_break?: number | null;
    price_cents?: number | null;
    category_id?: string | null;
    categories: {
      id?: string;
      name: string;
      color?: string | null;
    } | null;
  } | null;
  clients: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string | null;
    email: string | null;
    notes?: string | null;
  } | null;
};

type ClientRow = {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
};

type ServiceRow = {
  id: string;
  name: string;
  duration_minutes: number;
  duration_before_break: number | null;
  break_duration: number | null;
  duration_after_break: number | null;
  price_cents: number;
  category_id?: string | null;
  categories: {
    id?: string;
    name: string;
    color?: string | null;
  } | null;
};

type ClientAppointmentHistory = {
  id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: "confirmed" | "cancelled" | "completed";
  price_cents: number;
  services: {
    name: string;
    categories: {
      name: string;
      color?: string | null;
    } | null;
  } | null;
};

type SalonSettings = {
  id: string;
  salon_name: string;
  brevo_api_key?: string | null;
  sms_provider?: string | null;
  twilio_account_sid?: string | null;
  ovh_app_key?: string | null;
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
  logo_pro_image_url?: string | null;
  color_page_bg?: string | null;
  color_header_bg?: string | null;
  color_text_main?: string | null;
  color_salon_name?: string | null;
  color_card_border?: string | null;
  color_accents?: string | null;
  color_nav_text?: string | null;
  site_font?: string | null;
  font_salon_name?: string | null;
  bg_pattern?: string | null;
};

type ExceptionClosure = {
  id: string;
  closure_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  reason: string | null;
};

type BusySegment = {
  start: number;
  end: number;
};

type VisualAppointmentSegment = {
  id: string;
  appointmentId: string;
  top: number;
  height: number;
  appointment: AppointmentRow;
  label: string;
  isSecondPart: boolean;
  showPauseBadge: boolean;
  sizeMode: "small" | "medium" | "large";
  column: number;
  totalColumns: number;
};

type CategoryOption = {
  id: string;
  name: string;
  color?: string | null;
};

type StaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
  is_active: boolean;
};

type StaffSchedule = {
  id: string;
  staff_id: string;
  day_of_week: number;
  is_open: boolean;
  opening_time: string;
  closing_time: string;
  has_break: boolean;
  break_start: string | null;
  break_end: string | null;
};

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_SLUGS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
const MONTH_NAMES = [
  "janvier", "février", "mars", "avril", "mai", "juin",
  "juillet", "août", "septembre", "octobre", "novembre", "décembre",
];

const SLOT_STEP = 15;
const PX_PER_MINUTE = 3;
const PX_PER_MINUTE_WEEK = 2;

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function getTodayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${pad2(now.getMonth() + 1)}-${pad2(now.getDate())}`;
}

function parseDateKey(dateStr: string) {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, 12, 0, 0, 0);
}

function addDays(dateStr: string, days: number) {
  const d = parseDateKey(dateStr);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function formatFrenchDate(dateStr: string) {
  return parseDateKey(dateStr).toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatPrice(priceCents: number) {
  return `${(priceCents / 100).toFixed(2).replace(".00", "")} €`;
}

function formatTime(timeStr: string) {
  return timeStr.slice(0, 5);
}

function parseTimeToMinutes(str: string) {
  const clean = str.slice(0, 5);
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + m;
}

function minutesToLabel(min: number) {
  return `${pad2(Math.floor(min / 60))}:${pad2(min % 60)}`;
}

function overlaps(startA: number, endA: number, startB: number, endB: number) {
  return startA < endB && endA > startB;
}

function assignColumns(segments: VisualAppointmentSegment[]): VisualAppointmentSegment[] {
  const n = segments.length;
  if (n === 0) return [];

  const doOverlap = (a: VisualAppointmentSegment, b: VisualAppointmentSegment) =>
    a.top < b.top + b.height && b.top < a.top + a.height;

  const parent = Array.from({ length: n }, (_, i) => i);
  const find = (x: number): number => (parent[x] === x ? x : (parent[x] = find(parent[x])));
  const union = (x: number, y: number) => { parent[find(x)] = find(y); };

  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      if (doOverlap(segments[i], segments[j])) union(i, j);

  const groups = new Map<number, number[]>();
  for (let i = 0; i < n; i++) {
    const root = find(i);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(i);
  }

  const columns = new Array(n).fill(0);
  const totalCols = new Array(n).fill(1);

  for (const indices of groups.values()) {
    if (indices.length === 1) continue;
    indices.sort((a, b) => segments[a].top - segments[b].top);
    const colEndTimes: number[] = [];
    for (const idx of indices) {
      const seg = segments[idx];
      let col = 0;
      while (colEndTimes[col] !== undefined && colEndTimes[col] > seg.top) col++;
      columns[idx] = col;
      colEndTimes[col] = seg.top + seg.height;
    }
    const total = Math.max(...indices.map((i) => columns[i])) + 1;
    for (const idx of indices) totalCols[idx] = total;
  }

  return segments.map((seg, i) => ({ ...seg, column: columns[i], totalColumns: totalCols[i] }));
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function getStatusLabel(status: AppointmentRow["status"]) {
  if (status === "confirmed") return "Confirmé";
  if (status === "cancelled") return "Annulé";
  return "Terminé";
}

function getBadgeClasses(status: AppointmentRow["status"]) {
  if (status === "confirmed") return "bg-[#eef8f0] text-[#1f6a3a] border-[#cfe5d6]";
  if (status === "cancelled") return "bg-[#fff1f1] text-[#a33a3a] border-[#efc9c9]";
  return "bg-[#f3f0ff] text-[#5c46b5] border-[#d8d0fa]";
}

function getCardClasses(status: AppointmentRow["status"]) {
  if (status === "confirmed") return "border-[#d8eadf] bg-[#f7fcf8]";
  if (status === "cancelled") return "border-[#efd7d7] bg-[#fff8f8]";
  return "border-[#ddd7f5] bg-[#faf8ff]";
}

function hexToRgb(hex: string) {
  const value = hex.replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;

  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function contrastText(hex: string): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return "#ffffff";
  const lum = (0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b) / 255;
  return lum > 0.40 ? "#111827" : "#ffffff";
}

function derivePanelBg(hex: string): string {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const clamp = (v: number) => Math.min(255, v + 20);
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function derivePanelBgSecondary(hex: string): string {
  const panel = derivePanelBg(hex);
  const clean = panel.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  const offset = luminance > 0.5 ? -8 : 8;
  const clamp = (v: number) => Math.max(0, Math.min(255, v + offset));
  return `#${[r, g, b].map((c) => clamp(c).toString(16).padStart(2, "0")).join("")}`;
}

function getCategoryCardClasses(categoryName?: string | null) {
  const value = (categoryName ?? "").trim().toLowerCase();

  if (!value) return "border-[var(--card-border)] bg-[#fffaf4]";
  if (value.includes("coupe")) return "border-[#d6e6f5] bg-[#f3f8fe]";
  if (value.includes("color") || value.includes("balay") || value.includes("mèche") || value.includes("meche")) {
    return "border-[#f0d7c8] bg-[#fff6ef]";
  }
  if (value.includes("brushing") || value.includes("coiff") || value.includes("mise en pli")) {
    return "border-[#e4dbf6] bg-[#f8f4ff]";
  }
  if (value.includes("barbe") || value.includes("homme")) return "border-[#d6e2db] bg-[#f3f8f5]";
  if (value.includes("soin") || value.includes("bot") || value.includes("masque")) {
    return "border-[#d9ece2] bg-[#f4fbf7]";
  }
  if (value.includes("enfant")) return "border-[#f6dfc7] bg-[#fff8f0]";

  const palettes = [
    "border-[#d6e6f5] bg-[#f3f8fe]",
    "border-[#f0d7c8] bg-[#fff6ef]",
    "border-[#e4dbf6] bg-[#f8f4ff]",
    "border-[#d9ece2] bg-[#f4fbf7]",
    "border-[#f2decb] bg-[#fff8f2]",
    "border-[#e4e0d6] bg-[#fbf8f2]",
  ];

  const index = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0) % palettes.length;
  return palettes[index];
}

function getCategoryCardStyle(categoryColor?: string | null) {
  if (!categoryColor) return undefined;

  const rgb = hexToRgb(categoryColor);
  if (!rgb) return undefined;

  return {
    backgroundColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
    borderColor: `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, 1)`,
  };
}

function isOpenDayFromSettings(dateStr: string, settings: SalonSettings | null) {
  if (!settings) return true;

  const day = parseDateKey(dateStr).getDay();

  if (day === 1) return settings.is_open_monday;
  if (day === 2) return settings.is_open_tuesday;
  if (day === 3) return settings.is_open_wednesday;
  if (day === 4) return settings.is_open_thursday;
  if (day === 5) return settings.is_open_friday;
  if (day === 6) return settings.is_open_saturday;
  return settings.is_open_sunday;
}

function isBlockedByExceptionalClosure(
  startMinutes: number,
  endMinutes: number,
  closures: ExceptionClosure[]
) {
  return closures.some((closure) => {
    if (closure.is_all_day) return true;
    if (!closure.start_time || !closure.end_time) return false;

    const closureStart = parseTimeToMinutes(closure.start_time);
    const closureEnd = parseTimeToMinutes(closure.end_time);

    return overlaps(startMinutes, endMinutes, closureStart, closureEnd);
  });
}

function getServiceSegmentsFromService(
  service: ServiceRow | null,
  startMinutes: number
) {
  const pause = service?.break_duration ?? 0;
  const after = service?.duration_after_break ?? 0;
  const before = service?.duration_before_break ?? Math.max(0, (service?.duration_minutes ?? 0) - pause - after);

  const segment1Start = startMinutes;
  const segment1End = segment1Start + before;

  const breakStart = segment1End;
  const breakEnd = breakStart + pause;

  const segment2Start = breakEnd;
  const segment2End = segment2Start + after;

  return {
    before,
    pause,
    after,
    totalDuration: before + pause + after,
    segment1Start,
    segment1End,
    breakStart,
    breakEnd,
    segment2Start,
    segment2End,
    totalEnd: segment2End,
  };
}

function getAppointmentBusySegments(appointment: AppointmentRow): BusySegment[] {
  const start = parseTimeToMinutes(appointment.start_time);
  const end = parseTimeToMinutes(appointment.end_time);

  const hasBreak = !!appointment.break_start_time && !!appointment.break_end_time;

  if (!hasBreak) {
    return [{ start, end }];
  }

  const breakStart = parseTimeToMinutes(appointment.break_start_time!);
  const breakEnd = parseTimeToMinutes(appointment.break_end_time!);

  return [
    { start, end: breakStart },
    { start: breakEnd, end },
  ];
}

export default function BackOfficePage() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const { id: salonId } = useSalon();

  const [selectedDate, setSelectedDate] = useState("");

  const nowRef = new Date();
  const [calYear, setCalYear] = useState(nowRef.getFullYear());
  const [calMonth, setCalMonth] = useState(nowRef.getMonth());
  const [nowMinutes, setNowMinutes] = useState(() => { const n = new Date(); return n.getHours() * 60 + n.getMinutes(); });

  const calDays = Array.from(
    { length: new Date(calYear, calMonth + 1, 0).getDate() },
    (_, i) => {
      const d = i + 1;
      return `${calYear}-${String(calMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    }
  );

  const calStartPadding = (new Date(calYear, calMonth, 1).getDay() + 6) % 7;

  const handleCalPrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };

  const handleCalNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [clients, setClients] = useState<ClientRow[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [settings, setSettings] = useState<SalonSettings | null>(null);

  useEffect(() => {
    try {
      const c = localStorage.getItem("bo_settings_cache");
      if (c) setSettings(JSON.parse(c) as SalonSettings);
    } catch {}
  }, []);
  const [exceptionClosures, setExceptionClosures] = useState<ExceptionClosure[]>([]);

  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmCancelAppointment, setConfirmCancelAppointment] = useState(false);

  const [hoveredWeekSegId, setHoveredWeekSegId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [savingCreate, setSavingCreate] = useState(false);
  const [createModalError, setCreateModalError] = useState("");
  const [createOverlapWarning, setCreateOverlapWarning] = useState(false);

  const [createDate, setCreateDate] = useState("");
  const [modalCalMonth, setModalCalMonth] = useState(nowRef.getMonth());
  const [modalCalYear, setModalCalYear] = useState(nowRef.getFullYear());
  const [createTime, setCreateTime] = useState("");
  const [createCategoryFilter, setCreateCategoryFilter] = useState("all");
  const [createServiceId, setCreateServiceId] = useState("");
  const [createClientMode, setCreateClientMode] = useState<"existing" | "new">("existing");
  const [createExistingClientId, setCreateExistingClientId] = useState("");
  const [createClientSearch, setCreateClientSearch] = useState("");
  const [createFirstName, setCreateFirstName] = useState("");
  const [createLastName, setCreateLastName] = useState("");
  const [createPhone, setCreatePhone] = useState("");
  const [createEmail, setCreateEmail] = useState("");
  const [createClientNotes, setCreateClientNotes] = useState("");
  const [createMessage, setCreateMessage] = useState("");
  const [createInternalNote, setCreateInternalNote] = useState("");

  const [selectedClient, setSelectedClient] = useState<ClientRow | null>(null);
  const [selectedClientAppointments, setSelectedClientAppointments] = useState<ClientAppointmentHistory[]>([]);
  const [loadingClientDetails, setLoadingClientDetails] = useState(false);
  const [isEditingClient, setIsEditingClient] = useState(false);
  const [savingClient, setSavingClient] = useState(false);
  const [editClientFirstName, setEditClientFirstName] = useState("");
  const [editClientLastName, setEditClientLastName] = useState("");
  const [editClientPhone, setEditClientPhone] = useState("");
  const [editClientEmail, setEditClientEmail] = useState("");
  const [editClientNotes, setEditClientNotes] = useState("");

  const [selectedAppointment, setSelectedAppointment] = useState<AppointmentRow | null>(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [createStaffId, setCreateStaffId] = useState<string>("");

  const [isEditingAppointment, setIsEditingAppointment] = useState(false);
  const [savingEditAppointment, setSavingEditAppointment] = useState(false);
  const [editAppointmentDate, setEditAppointmentDate] = useState("");
  const [editAppointmentTime, setEditAppointmentTime] = useState("");
  const [editCategoryFilter, setEditCategoryFilter] = useState("all");
  const [editAppointmentServiceId, setEditAppointmentServiceId] = useState("");
  const [editAppointmentMessage, setEditAppointmentMessage] = useState("");
  const [editAppointmentInternalNote, setEditAppointmentInternalNote] = useState("");
  const [smsCredits, setSmsCredits] = useState<{ provider: string; smsCount?: number | null; balance?: string; currency?: string; creditsLeft?: number } | null>(null);
  const [agendaView, setAgendaView] = useState<"day" | "week">("week");
  const [weekAppointments, setWeekAppointments] = useState<AppointmentRow[]>([]);
  const [weekExceptionClosures, setWeekExceptionClosures] = useState<ExceptionClosure[]>([]);
  const [loadingWeek, setLoadingWeek] = useState(false);

  const agendaViewRef = useRef(agendaView);
  const weekDaysRef = useRef<string[]>([]);
  useEffect(() => { agendaViewRef.current = agendaView; }, [agendaView]);

  const hasSmsConfigured = settings && (
    (settings.sms_provider === "twilio" && settings.twilio_account_sid) ||
    (settings.sms_provider === "ovh" && settings.ovh_app_key) ||
    ((!settings.sms_provider || settings.sms_provider === "brevo") && settings.brevo_api_key)
  );
  useEffect(() => {
    if (!hasSmsConfigured) return;
    fetch("/api/brevo-credits")
      .then((r) => r.json())
      .then((d) => { if (!d.error) setSmsCredits(d); })
      .catch(() => {});
  }, [hasSmsConfigured]);

  const dayStart = useMemo(() => {
    if (!settings) return parseTimeToMinutes("09:00");
    const dow = selectedDate ? new Date(selectedDate + "T12:00:00").getDay() : 1;
    const slug = DAY_SLUGS[dow];
    const t = (settings[`opening_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5)
      ?? settings.opening_time?.slice(0, 5)
      ?? "09:00";
    return parseTimeToMinutes(t);
  }, [settings, selectedDate]);
  const dayEnd = useMemo(() => {
    if (!settings) return parseTimeToMinutes("19:00");
    const dow = selectedDate ? new Date(selectedDate + "T12:00:00").getDay() : 1;
    const slug = DAY_SLUGS[dow];
    const t = (settings[`closing_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5)
      ?? settings.closing_time?.slice(0, 5)
      ?? "19:00";
    return parseTimeToMinutes(t);
  }, [settings, selectedDate]);
  const dayHeight = (dayEnd - dayStart) * PX_PER_MINUTE;

  useEffect(() => {
    document.body.style.overflow =
      showCreateModal || !!selectedClient || showAppointmentModal ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [showCreateModal, selectedClient, showAppointmentModal]);

  const loadAppointments = async (dateValue: string) => {
    setLoading(true);
    setStatusMessage("");

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        start_time,
        end_time,
        break_start_time,
        break_end_time,
        status,
        source,
        price_cents,
        client_message,
        internal_note,
        client_id,
        service_id,
        staff_id,
        services (
          id,
          name,
          duration_minutes,
          duration_before_break,
          break_duration,
          duration_after_break,
          price_cents,
          category_id,
          categories (
            id,
            name,
            color
          )
        ),
        clients (
          id,
          first_name,
          last_name,
          phone,
          email,
          notes
        )
      `
      )
      .eq("salon_id", salonId)
      .eq("appointment_date", dateValue)
      .in("status", ["confirmed", "completed"])
      .order("start_time", { ascending: true });

    if (error) {
      setAppointments([]);
      setStatusMessage(`Erreur : ${(error as Error).message}`);
      setLoading(false);
      return;
    }

    setAppointments((data ?? []) as unknown as AppointmentRow[]);
    setLoading(false);
  };

  const loadClosuresForDay = async (dateValue: string) => {
    const { data, error } = await supabase
      .from("exception_closures")
      .select("id, closure_date, start_time, end_time, is_all_day, reason")
      .eq("salon_id", salonId)
      .eq("closure_date", dateValue)
      .order("start_time", { ascending: true });

    if (error) {
      setExceptionClosures([]);
      setStatusMessage((prev) =>
        prev ? `${prev} | Erreur fermetures : ${(error as Error).message}` : `Erreur fermetures : ${(error as Error).message}`
      );
      return;
    }

    setExceptionClosures((data ?? []) as ExceptionClosure[]);
  };

  const loadWeekAppointments = async (weekStart: string, weekEnd: string) => {
    setLoadingWeek(true);
    const { data } = await supabase
      .from("appointments")
      .select(`id, appointment_date, start_time, end_time, break_start_time, break_end_time, status, source, price_cents, client_message, internal_note, client_id, service_id, staff_id,
        services(id, name, duration_minutes, duration_before_break, break_duration, duration_after_break, price_cents, category_id, categories(id, name, color)),
        clients(id, first_name, last_name, phone, email, notes)`)
      .eq("salon_id", salonId)
      .gte("appointment_date", weekStart)
      .lte("appointment_date", weekEnd)
      .in("status", ["confirmed", "completed"])
      .order("start_time", { ascending: true });
    setWeekAppointments((data ?? []) as unknown as AppointmentRow[]);
    setLoadingWeek(false);
  };

  const loadWeekClosures = async (weekStart: string, weekEnd: string) => {
    const { data } = await supabase
      .from("exception_closures")
      .select("id, closure_date, start_time, end_time, is_all_day, reason")
      .eq("salon_id", salonId)
      .gte("closure_date", weekStart)
      .lte("closure_date", weekEnd)
      .order("closure_date", { ascending: true });
    setWeekExceptionClosures((data ?? []) as ExceptionClosure[]);
  };

  const loadWeekData = async (weekStart: string, weekEnd: string) => {
    await Promise.all([
      loadWeekAppointments(weekStart, weekEnd),
      loadWeekClosures(weekStart, weekEnd),
    ]);
  };

  const loadInitialData = async () => {
    const { data: settingsData } = await supabase
      .from("salon_settings")
      .select("*")
      .eq("salon_id", salonId)
      .limit(1)
      .maybeSingle();

    if (settingsData) { try { localStorage.setItem("bo_settings_cache", JSON.stringify(settingsData)); } catch {} }
    setSettings((settingsData ?? null) as SalonSettings | null);

    const { data: clientsData } = await supabase
      .from("clients")
      .select("id, first_name, last_name, phone, email, notes")
      .eq("salon_id", salonId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true })
      .limit(10000);

    setClients((clientsData ?? []) as ClientRow[]);

    const { data: servicesData } = await supabase
      .from("services")
      .select(
        `
        id,
        name,
        duration_minutes,
        duration_before_break,
        break_duration,
        duration_after_break,
        price_cents,
        category_id,
        categories (
          id,
          name
        )
      `
      )
      .eq("salon_id", salonId)
      .eq("is_visible", true)
      .order("display_order", { ascending: true });

    setServices((servicesData ?? []) as unknown as ServiceRow[]);

    const { data: staffData } = await supabase
      .from("staff")
      .select("id, first_name, last_name, color, is_active")
      .eq("salon_id", salonId)
      .eq("is_active", true)
      .order("last_name", { ascending: true });

    const staffList = (staffData ?? []) as StaffRow[];
    setStaff(staffList);
    if (staffList.length > 0) setSelectedStaffId(staffList[0].id);

    const { data: schedulesData } = await supabase
      .from("staff_schedules")
      .select("*")
      .eq("salon_id", salonId)
      .order("day_of_week", { ascending: true });

    setStaffSchedules((schedulesData ?? []) as StaffSchedule[]);
  };

  useEffect(() => {
    if (!selectedDate) return;

    loadAppointments(selectedDate);
    loadClosuresForDay(selectedDate);

    const channel = supabase
      .channel(`appointments-${selectedDate}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "appointments",
        },
        (payload: RealtimePayload) => {
          const date =
            payload?.new?.appointment_date ||
            payload?.old?.appointment_date;
          if (!date || date === selectedDate) {
            loadAppointments(selectedDate);
          }
          const wd = weekDaysRef.current;
          if (agendaViewRef.current === "week" && wd.length === 7) {
            if (!date || (date >= wd[0] && date <= wd[6])) {
              loadWeekData(wd[0], wd[6]);
            }
          }
        }
      )
      .subscribe();

    // Polling de secours toutes les 30s pour capter les UPDATE non transmis par Realtime
    const interval = setInterval(() => {
      loadAppointments(selectedDate);
      const wd = weekDaysRef.current;
      if (agendaViewRef.current === "week" && wd.length === 7) {
        loadWeekData(wd[0], wd[6]);
      }
    }, 30000);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(interval);
    };
  }, [selectedDate]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadAppointments(selectedDate);
        const wd = weekDaysRef.current;
        if (agendaViewRef.current === "week" && wd.length === 7) {
          loadWeekData(wd[0], wd[6]);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [selectedDate]);

  useEffect(() => {
    const today = getTodayKey();
    setSelectedDate(today);
    setCreateDate(today);
    loadInitialData();

    const clientsChannel = supabase
      .channel('clients-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'clients',
        },
        () => {
          loadInitialData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(clientsChannel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const filteredAppointments = useMemo(() => {
    if (!selectedStaffId || selectedStaffId === "all") return appointments;
    return appointments.filter((a) => a.staff_id === selectedStaffId);
  }, [appointments, selectedStaffId]);

  const stats = useMemo(() => {
    const upcoming = filteredAppointments.filter((a) => {
      const endMinutes = parseTimeToMinutes(a.end_time.slice(0, 5));
      return endMinutes > nowMinutes || a.appointment_date > getTodayKey();
    }).length;
    const past = filteredAppointments.filter((a) => {
      const endMinutes = parseTimeToMinutes(a.end_time.slice(0, 5));
      return endMinutes <= nowMinutes && a.appointment_date <= getTodayKey();
    }).length;

    return {
      total: filteredAppointments.length,
      upcoming,
      past,
    };
  }, [filteredAppointments, nowMinutes]);

  const categoryOptions = useMemo<CategoryOption[]>(() => {
    const map = new Map<string, CategoryOption>();

    services.forEach((service) => {
      const id = service.category_id || service.categories?.id || service.categories?.name || "sans-categorie";
      const name = service.categories?.name || "Sans catégorie";

      if (!map.has(id)) {
        map.set(id, { id, name, color: service.categories?.color ?? null });
      }
    });

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [services]);

  const filteredCreateServices = useMemo(() => {
    if (createCategoryFilter === "all") return services;
    return services.filter((service) => {
      const serviceCategoryId =
        service.category_id || service.categories?.id || service.categories?.name || "sans-categorie";
      return serviceCategoryId === createCategoryFilter;
    });
  }, [services, createCategoryFilter]);

  const filteredEditServices = useMemo(() => {
    if (editCategoryFilter === "all") return services;
    return services.filter((service) => {
      const serviceCategoryId =
        service.category_id || service.categories?.id || service.categories?.name || "sans-categorie";
      return serviceCategoryId === editCategoryFilter;
    });
  }, [services, editCategoryFilter]);

  const filteredCreateServiceOptions = useMemo(() => {
    return filteredCreateServices.map((service) => ({
      ...service,
      label: `${service.name} • ${service.duration_minutes} min • ${formatPrice(service.price_cents)}`,
    }));
  }, [filteredCreateServices]);

  const filteredEditServiceOptions = useMemo(() => {
    return filteredEditServices.map((service) => ({
      ...service,
      label: `${service.name} • ${service.duration_minutes} min • ${formatPrice(service.price_cents)}`,
    }));
  }, [filteredEditServices]);

  const selectedCreateStaffMember = useMemo(
    () => staff.find((m) => m.id === createStaffId) ?? null,
    [staff, createStaffId]
  );

  // Schedule du jour sélectionné pour la prestataire en cours de création
  const createStaffSchedule = useMemo(() => {
    if (!selectedCreateStaffMember || !createDate) return null;
    const dow = new Date(createDate + "T12:00:00").getDay();
    return staffSchedules.find((s) => s.staff_id === selectedCreateStaffMember.id && s.day_of_week === dow) ?? null;
  }, [selectedCreateStaffMember, createDate, staffSchedules]);

  // Schedule du jour affiché pour la prestataire sélectionnée dans l'agenda
  const selectedStaffScheduleToday = useMemo(() => {
    if (!selectedStaffId || !selectedDate) return null;
    const dow = new Date(selectedDate + "T12:00:00").getDay();
    return staffSchedules.find((s) => s.staff_id === selectedStaffId && s.day_of_week === dow) ?? null;
  }, [selectedStaffId, selectedDate, staffSchedules]);

  const createDayStart = useMemo(() => {
    if (!createStaffSchedule) return dayStart;
    return Math.max(dayStart, parseTimeToMinutes(createStaffSchedule.opening_time.slice(0, 5)));
  }, [createStaffSchedule, dayStart]);

  const createDayEnd = useMemo(() => {
    if (!createStaffSchedule) return dayEnd;
    return Math.min(dayEnd, parseTimeToMinutes(createStaffSchedule.closing_time.slice(0, 5)));
  }, [createStaffSchedule, dayEnd]);

  const createDateClosures = useMemo(
    () => createDate === selectedDate
      ? exceptionClosures
      : weekExceptionClosures.filter((c) => c.closure_date === createDate),
    [createDate, selectedDate, exceptionClosures, weekExceptionClosures]
  );

  const allKnownAppointmentsForCreate = useMemo(
    () => [
      ...appointments,
      ...weekAppointments.filter((wa) => !appointments.some((a) => a.id === wa.id)),
    ],
    [appointments, weekAppointments]
  );

  const selectedCreateService = useMemo(
    () => services.find((s) => s.id === createServiceId) ?? null,
    [services, createServiceId]
  );

  const selectedEditService = useMemo(
    () => services.find((s) => s.id === editAppointmentServiceId) ?? null,
    [services, editAppointmentServiceId]
  );

  const clientSortedOptions = useMemo(() => {
    return [...clients].sort((a, b) =>
      `${a.last_name} ${a.first_name}`.localeCompare(`${b.last_name} ${b.first_name}`, "fr")
    );
  }, [clients]);

  const filteredExistingClients = useMemo(() => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    const query = normalize(createClientSearch.trim());

    if (!query) return [];

    return clientSortedOptions
      .filter((client) => {
        const haystack = normalize(`${client.first_name ?? ""} ${client.last_name ?? ""} ${client.phone ?? ""}`.trim());
        return haystack.includes(query);
      })
      .slice(0, 12);
  }, [clientSortedOptions, createClientSearch]);

  const selectedExistingClient = useMemo(
    () => clientSortedOptions.find((client) => client.id === createExistingClientId) ?? null,
    [clientSortedOptions, createExistingClientId]
  );

  const hourSlots = useMemo(() => {
    const arr: number[] = [];
    for (let m = dayStart; m <= dayEnd; m += SLOT_STEP) arr.push(m);
    return arr;
  }, [dayStart, dayEnd]);

  const dayHasAllDayClosure = useMemo(() => {
    return exceptionClosures.some((closure) => closure.is_all_day);
  }, [exceptionClosures]);

  const openAppointmentModal = (appointment: AppointmentRow) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
    setIsEditingAppointment(false);
    setEditAppointmentDate(appointment.appointment_date);
    setEditAppointmentTime(formatTime(appointment.start_time));
    setEditAppointmentServiceId(appointment.services?.id ?? appointment.service_id ?? "");
    const appointmentCategoryId =
      appointment.services?.category_id ||
      appointment.services?.categories?.id ||
      appointment.services?.categories?.name ||
      "sans-categorie";
    setEditCategoryFilter(appointment.services ? appointmentCategoryId : "all");
    setEditAppointmentMessage(appointment.client_message ?? "");
    setEditAppointmentInternalNote(appointment.internal_note ?? "");
  };

  const closeAppointmentModal = () => {
    setSelectedAppointment(null);
    setShowAppointmentModal(false);
    setIsEditingAppointment(false);
    setEditAppointmentDate("");
    setEditAppointmentTime("");
    setEditCategoryFilter("all");
    setEditAppointmentServiceId("");
    setEditAppointmentMessage("");
    setEditAppointmentInternalNote("");
    setConfirmCancelAppointment(false);
  };

  const handleStatusChange = async (
    appointmentId: string,
    newStatus: AppointmentRow["status"]
  ) => {
    try {
      setUpdatingId(appointmentId);
      setStatusMessage("");

      const { error } = await supabase
        .from("appointments")
        .update({ status: newStatus })
        .eq("id", appointmentId)
        .eq("salon_id", salonId);

      if (error) throw new Error((error as Error).message);

      await loadAppointments(selectedDate);
      if (agendaView === "week" && weekDays.length === 7) {
        await loadWeekData(weekDays[0], weekDays[6]);
      }
      setStatusMessage(
        newStatus === "cancelled" ? "Rendez-vous annulé ✅" : "Statut mis à jour ✅"
      );
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de mettre à jour le statut."}`);
    } finally {
      setUpdatingId(null);
    }
  };

  const openCreateModal = (date: string, timeLabel: string) => {
    setCreateDate(date);
    setCreateTime(timeLabel);
    setCreateCategoryFilter("all");
    setCreateServiceId("");
    setCreateClientMode("existing");
    setCreateExistingClientId("");
    setCreateClientSearch("");
    setCreateFirstName("");
    setCreateLastName("");
    setCreatePhone("");
    setCreateEmail("");
    setCreateClientNotes("");
    setCreateMessage("");
    setCreateInternalNote("");
    setCreateStaffId(selectedStaffId || "");
    setShowCreateModal(true);
    setStatusMessage("");
    setCreateModalError("");
  };

  const closeCreateModal = () => {
    setShowCreateModal(false);
    setCreateOverlapWarning(false);
    setCreateModalError("");
  };

  const loadClientDetails = async (clientId: string) => {
    const client = clients.find((c) => c.id === clientId) ?? null;
    if (client) setSelectedClient(client);

    setLoadingClientDetails(true);

    const { data, error } = await supabase
      .from("appointments")
      .select(
        `
        id,
        appointment_date,
        start_time,
        end_time,
        status,
        price_cents,
        services (
          name,
          categories (
            name,
            color
          )
        )
      `
      )
      .eq("salon_id", salonId)
      .eq("client_id", clientId)
      .order("appointment_date", { ascending: false })
      .order("start_time", { ascending: false });

    if (error) {
      setStatusMessage(`Erreur : ${(error as Error).message}`);
      setSelectedClientAppointments([]);
      setLoadingClientDetails(false);
      return;
    }

    setSelectedClientAppointments((data ?? []) as unknown as ClientAppointmentHistory[]);
    setLoadingClientDetails(false);
  };

  const closeClientModal = () => {
    setSelectedClient(null);
    setSelectedClientAppointments([]);
    setIsEditingClient(false);
    setEditClientFirstName("");
    setEditClientLastName("");
    setEditClientPhone("");
    setEditClientEmail("");
    setEditClientNotes("");
  };

  const openClientEdit = () => {
    if (!selectedClient) return;
    setEditClientFirstName(selectedClient.first_name);
    setEditClientLastName(selectedClient.last_name);
    setEditClientPhone(selectedClient.phone ?? "");
    setEditClientEmail(selectedClient.email ?? "");
    setEditClientNotes(selectedClient.notes ?? "");
    setIsEditingClient(true);
  };

  const handleSaveClient = async () => {
    if (!selectedClient) return;
    const cleanPhone = normalizePhone(editClientPhone);
    if (!editClientFirstName.trim() || !editClientLastName.trim()) return;
    if (cleanPhone.length !== 10) return;

    try {
      setSavingClient(true);
      const { error } = await supabase
        .from("clients")
        .update({
          first_name: editClientFirstName.trim(),
          last_name: editClientLastName.trim(),
          phone: cleanPhone,
          email: editClientEmail.trim() || null,
          notes: editClientNotes.trim() || null,
        })
        .eq("id", selectedClient.id)
        .eq("salon_id", salonId);

      if (error) throw new Error(error.message);

      setSelectedClient({
        ...selectedClient,
        first_name: editClientFirstName.trim(),
        last_name: editClientLastName.trim(),
        phone: cleanPhone,
        email: editClientEmail.trim() || null,
        notes: editClientNotes.trim() || null,
      });
      await loadInitialData();
      setIsEditingClient(false);
    } catch (err: unknown) {
      console.error(err);
    } finally {
      setSavingClient(false);
    }
  };

  const handleCreateAppointment = async (forceOverlap = false) => {
    if (!selectedCreateService) {
      setCreateModalError("Choisis une prestation.");
      return;
    }

    if (!isOpenDayFromSettings(createDate, settings)) {
      setCreateModalError("Le salon est fermé ce jour-là.");
      return;
    }

    if (createDateClosures.some((c) => c.is_all_day)) {
      setCreateModalError("Le salon est fermé exceptionnellement toute la journée.");
      return;
    }

    const startMinutes = parseTimeToMinutes(createTime);
    const serviceSegments = getServiceSegmentsFromService(selectedCreateService, startMinutes);
    const endMinutes = serviceSegments.totalEnd;


    if (startMinutes < createDayStart) {
      setCreateModalError(`L’heure de début doit être après l’ouverture (${pad2(Math.floor(createDayStart / 60))}:${pad2(createDayStart % 60)}).`);
      return;
    }
    if (endMinutes > createDayEnd) {
      setCreateModalError("Le rendez-vous dépasse l’horaire de fermeture.");
      return;
    }

    const blockedByAppointments = allKnownAppointmentsForCreate.some((appointment) => {
      if (appointment.appointment_date !== createDate) return false;
      if (createStaffId && appointment.staff_id && appointment.staff_id !== createStaffId) return false;

      const busySegments = getAppointmentBusySegments(appointment);

      const overlapsFirst = busySegments.some((segment) =>
        overlaps(
          serviceSegments.segment1Start,
          serviceSegments.segment1End,
          segment.start,
          segment.end
        )
      );

      const overlapsSecond =
        serviceSegments.after > 0 &&
        busySegments.some((segment) =>
          overlaps(
            serviceSegments.segment2Start,
            serviceSegments.segment2End,
            segment.start,
            segment.end
          )
        );

      return overlapsFirst || overlapsSecond;
    });

    const blockedByClosures =
      isBlockedByExceptionalClosure(
        serviceSegments.segment1Start,
        serviceSegments.segment1End,
        createDateClosures
      ) ||
      (serviceSegments.after > 0 &&
        isBlockedByExceptionalClosure(
          serviceSegments.segment2Start,
          serviceSegments.segment2End,
          createDateClosures
        ));

    if (blockedByClosures) {
      setCreateModalError("Ce créneau est bloqué par une fermeture exceptionnelle.");
      return;
    }

    if (blockedByAppointments && !forceOverlap) {
      setCreateOverlapWarning(true);
      return;
    }

    try {
      setSavingCreate(true);
      setCreateModalError("");
      setCreateOverlapWarning(false);

      let clientId: string | null = null;

      if (createClientMode === "existing") {
        if (!createExistingClientId) {
          setCreateModalError("Choisis un client existant.");
          setSavingCreate(false);
          return;
        }
        clientId = createExistingClientId;
      } else {
        const cleanPhone = normalizePhone(createPhone);
        const hasPhone = cleanPhone.length === 10;

        if (hasPhone) {
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("salon_id", salonId)
            .eq("phone", cleanPhone)
            .maybeSingle();

          if (existingClient?.id) {
            clientId = existingClient.id;
            if (createFirstName.trim() || createLastName.trim()) {
              await supabase
                .from("clients")
                .update({
                  first_name: createFirstName.trim() || undefined,
                  last_name: createLastName.trim() || undefined,
                  email: createEmail.trim() || null,
                  notes: createClientNotes.trim() || null,
                })
                .eq("id", clientId)
                .eq("salon_id", salonId);
            }
          } else {
            const { data: insertedClient, error: insertClientError } = await supabase
              .from("clients")
              .insert({
                salon_id: salonId,
                first_name: createFirstName.trim() || "—",
                last_name: createLastName.trim() || "",
                phone: cleanPhone,
                email: createEmail.trim() || null,
                notes: createClientNotes.trim() || null,
              })
              .select("id")
              .single();

            if (insertClientError) throw new Error(insertClientError.message);
            clientId = insertedClient.id;
          }
        } else if (createFirstName.trim() || createLastName.trim()) {
          // Nom sans téléphone → fiche client légère sans phone
          const { data: insertedClient, error: insertClientError } = await supabase
            .from("clients")
            .insert({
              salon_id: salonId,
              first_name: createFirstName.trim() || "—",
              last_name: createLastName.trim() || "",
              phone: null,
              email: createEmail.trim() || null,
              notes: createClientNotes.trim() || null,
            })
            .select("id")
            .single();

          if (insertClientError) throw new Error(insertClientError.message);
          clientId = insertedClient.id;
        }
      }

      const startTime = `${createTime}:00`;
      const endTime = `${minutesToLabel(serviceSegments.totalEnd)}:00`;
      const breakStartTime =
        serviceSegments.pause > 0 ? `${minutesToLabel(serviceSegments.breakStart)}:00` : null;
      const breakEndTime =
        serviceSegments.pause > 0 ? `${minutesToLabel(serviceSegments.breakEnd)}:00` : null;

      const { error } = await supabase.from("appointments").insert({
        salon_id: salonId,
        client_id: clientId,
        service_id: selectedCreateService.id,
        appointment_date: createDate,
        start_time: startTime,
        end_time: endTime,
        break_start_time: breakStartTime,
        break_end_time: breakEndTime,
        status: "confirmed",
        source: "salon",
        client_message: createMessage.trim() || null,
        internal_note: createInternalNote.trim() || null,
        price_cents: selectedCreateService.price_cents,
        staff_id: createStaffId || null,
      });

      if (error) throw new Error((error as Error).message);

      await loadAppointments(selectedDate);
      await loadClosuresForDay(selectedDate);
      await loadInitialData();
      if (agendaView === "week" && weekDays.length === 7) {
        await loadWeekData(weekDays[0], weekDays[6]);
      }
      closeCreateModal();
      setCreateModalError("Rendez-vous ajouté ✅");
    } catch (error: unknown) {
      setCreateModalError(`Erreur : ${(error as Error).message ?? "Impossible d'ajouter le rendez-vous."}`);
    } finally {
      setSavingCreate(false);
    }
  };

  const handleSaveAppointmentEdit = async () => {
    if (!selectedAppointment) return;
    if (!selectedEditService) {
      setStatusMessage("Choisis une prestation.");
      return;
    }

    if (!isOpenDayFromSettings(editAppointmentDate, settings)) {
      setStatusMessage("Le salon est fermé ce jour-là.");
      return;
    }

    const startMinutes = parseTimeToMinutes(editAppointmentTime);
    const serviceSegments = getServiceSegmentsFromService(selectedEditService, startMinutes);
    const endMinutes = serviceSegments.totalEnd;

    if (endMinutes > (() => {
      if (!selectedAppointment?.staff_id || !editAppointmentDate) return dayEnd;
      const dow = new Date(editAppointmentDate + "T12:00:00").getDay();
      const sched = staffSchedules.find((s) => s.staff_id === selectedAppointment.staff_id && s.day_of_week === dow);
      return sched ? Math.min(dayEnd, parseTimeToMinutes(sched.closing_time.slice(0,5))) : dayEnd;
    })()) {
      setStatusMessage("Le rendez-vous dépasse l’horaire de fermeture.");
      return;
    }

    const editDateClosures = editAppointmentDate === selectedDate
      ? exceptionClosures
      : weekExceptionClosures.filter((c) => c.closure_date === editAppointmentDate);

    const allKnownAppointments = [
      ...appointments,
      ...weekAppointments.filter((wa) => !appointments.some((a) => a.id === wa.id)),
    ];

    const blockedByAppointments = allKnownAppointments.some((appointment) => {
      if (appointment.appointment_date !== editAppointmentDate) return false;
      if (appointment.id === selectedAppointment.id) return false;
      if (selectedAppointment.staff_id && appointment.staff_id && appointment.staff_id !== selectedAppointment.staff_id) return false;

      const busySegments = getAppointmentBusySegments(appointment);

      const overlapsFirst = busySegments.some((segment) =>
        overlaps(
          serviceSegments.segment1Start,
          serviceSegments.segment1End,
          segment.start,
          segment.end
        )
      );

      const overlapsSecond =
        serviceSegments.after > 0 &&
        busySegments.some((segment) =>
          overlaps(
            serviceSegments.segment2Start,
            serviceSegments.segment2End,
            segment.start,
            segment.end
          )
        );

      return overlapsFirst || overlapsSecond;
    });

    const blockedByClosures =
      isBlockedByExceptionalClosure(
        serviceSegments.segment1Start,
        serviceSegments.segment1End,
        editDateClosures
      ) ||
      (serviceSegments.after > 0 &&
        isBlockedByExceptionalClosure(
          serviceSegments.segment2Start,
          serviceSegments.segment2End,
          editDateClosures
        ));

    if (blockedByAppointments || blockedByClosures) {
      setStatusMessage("Ce créneau est indisponible.");
      return;
    }

    try {
      setSavingEditAppointment(true);
      setStatusMessage("");

      const startTime = `${editAppointmentTime}:00`;
      const endTime = `${minutesToLabel(serviceSegments.totalEnd)}:00`;
      const breakStartTime =
        serviceSegments.pause > 0 ? `${minutesToLabel(serviceSegments.breakStart)}:00` : null;
      const breakEndTime =
        serviceSegments.pause > 0 ? `${minutesToLabel(serviceSegments.breakEnd)}:00` : null;

      const { error } = await supabase
        .from("appointments")
        .update({
          appointment_date: editAppointmentDate,
          start_time: startTime,
          end_time: endTime,
          break_start_time: breakStartTime,
          break_end_time: breakEndTime,
          service_id: selectedEditService.id,
          client_message: editAppointmentMessage.trim() || null,
          internal_note: editAppointmentInternalNote.trim() || null,
          price_cents: selectedEditService.price_cents,
        })
        .eq("id", selectedAppointment.id)
        .eq("salon_id", salonId);

      if (error) throw new Error((error as Error).message);

      await loadAppointments(selectedDate);
      await loadClosuresForDay(selectedDate);
      if (agendaView === "week" && weekDays.length === 7) {
        await loadWeekData(weekDays[0], weekDays[6]);
      }

      const updatedSelectedAppointment: AppointmentRow = {
        ...selectedAppointment,
        appointment_date: editAppointmentDate,
        start_time: startTime,
        end_time: endTime,
        break_start_time: breakStartTime,
        break_end_time: breakEndTime,
        service_id: selectedEditService.id,
        client_message: editAppointmentMessage.trim() || null,
        internal_note: editAppointmentInternalNote.trim() || null,
        price_cents: selectedEditService.price_cents,
        services: {
          id: selectedEditService.id,
          name: selectedEditService.name,
          duration_minutes: selectedEditService.duration_minutes,
          duration_before_break: selectedEditService.duration_before_break,
          break_duration: selectedEditService.break_duration,
          duration_after_break: selectedEditService.duration_after_break,
          price_cents: selectedEditService.price_cents,
          category_id: selectedEditService.category_id,
          categories: selectedEditService.categories,
        },
      };

      setSelectedAppointment(updatedSelectedAppointment);
      setIsEditingAppointment(false);
      setStatusMessage("Rendez-vous modifié ✅");

      if (editAppointmentDate !== selectedDate) {
        closeAppointmentModal();
      }
    } catch (error: unknown) {
      setStatusMessage(`Erreur : ${(error as Error).message ?? "Impossible de modifier le rendez-vous."}`);
    } finally {
      setSavingEditAppointment(false);
    }
  };

  const visualAppointmentSegments = useMemo<VisualAppointmentSegment[]>(() => {
    const items: VisualAppointmentSegment[] = [];

    for (const appointment of filteredAppointments) {
      const busySegments = getAppointmentBusySegments(appointment);
      const hasBreak = busySegments.length === 2;

      busySegments.forEach((segment, index) => {
        const top = (segment.start - dayStart) * PX_PER_MINUTE;
        const realHeight = (segment.end - segment.start) * PX_PER_MINUTE;
        const height = Math.max(realHeight, 36);

        let sizeMode: "small" | "medium" | "large" = "medium";
        if (height <= 46) sizeMode = "small";
        else if (height >= 76) sizeMode = "large";

        items.push({
          id: `${appointment.id}-${index + 1}`,
          appointmentId: appointment.id,
          top,
          height,
          appointment,
          label: `${minutesToLabel(segment.start)} → ${minutesToLabel(segment.end)}`,
          isSecondPart: index === 1,
          showPauseBadge: hasBreak && index === 0,
          sizeMode,
          column: 0,
          totalColumns: 1,
        });
      });
    }

    return assignColumns(items.sort((a, b) => a.top - b.top));
  }, [filteredAppointments, dayStart]);

  const staffBreakBlock = useMemo(() => {
    if (!selectedStaffScheduleToday?.has_break || !selectedStaffScheduleToday.break_start || !selectedStaffScheduleToday.break_end) return null;
    const start = parseTimeToMinutes(selectedStaffScheduleToday.break_start.slice(0, 5));
    const end = parseTimeToMinutes(selectedStaffScheduleToday.break_end.slice(0, 5));
    return {
      top: (start - dayStart) * PX_PER_MINUTE,
      height: Math.max((end - start) * PX_PER_MINUTE, 24),
      label: `${selectedStaffScheduleToday.break_start.slice(0,5)} → ${selectedStaffScheduleToday.break_end.slice(0,5)}`,
    };
  }, [selectedStaffScheduleToday, dayStart]);

  const closureBlocks = useMemo(() => {
    return exceptionClosures
      .filter((closure) => !closure.is_all_day && closure.start_time && closure.end_time)
      .map((closure) => {
        const start = parseTimeToMinutes(closure.start_time!);
        const end = parseTimeToMinutes(closure.end_time!);
        const top = (start - dayStart) * PX_PER_MINUTE;
        const height = Math.max((end - start) * PX_PER_MINUTE, 36);

        return {
          ...closure,
          top,
          height,
        };
      });
  }, [exceptionClosures, dayStart]);

  // — Vue semaine —
  const weekDays = useMemo(() => {
    const d = parseDateKey(selectedDate);
    const dow = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - ((dow + 6) % 7));
    return Array.from({ length: 7 }, (_, i) => {
      const day = new Date(monday);
      day.setDate(monday.getDate() + i);
      return `${day.getFullYear()}-${pad2(day.getMonth() + 1)}-${pad2(day.getDate())}`;
    });
  }, [selectedDate]);
  useEffect(() => { weekDaysRef.current = weekDays; }, [weekDays]);

  const weekGlobalStart = useMemo(() => {
    if (!settings) return parseTimeToMinutes("09:00");
    const openDays = weekDays.filter((dk) => isOpenDayFromSettings(dk, settings));
    if (openDays.length === 0) return parseTimeToMinutes(settings.opening_time?.slice(0, 5) ?? "09:00");
    return openDays.reduce((min, dk) => {
      const dow = new Date(dk + "T12:00:00").getDay();
      const slug = DAY_SLUGS[dow];
      const t = (settings[`opening_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5)
        ?? settings.opening_time?.slice(0, 5) ?? "09:00";
      return Math.min(min, parseTimeToMinutes(t));
    }, parseTimeToMinutes(settings.opening_time?.slice(0, 5) ?? "09:00"));
  }, [settings, weekDays]);

  const weekGlobalEnd = useMemo(() => {
    if (!settings) return parseTimeToMinutes("19:00");
    const openDays = weekDays.filter((dk) => isOpenDayFromSettings(dk, settings));
    if (openDays.length === 0) return parseTimeToMinutes(settings.closing_time?.slice(0, 5) ?? "19:00");
    return openDays.reduce((max, dk) => {
      const dow = new Date(dk + "T12:00:00").getDay();
      const slug = DAY_SLUGS[dow];
      const t = (settings[`closing_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5)
        ?? settings.closing_time?.slice(0, 5) ?? "19:00";
      return Math.max(max, parseTimeToMinutes(t));
    }, parseTimeToMinutes(settings.closing_time?.slice(0, 5) ?? "19:00"));
  }, [settings, weekDays]);

  const pxPerMinuteWeek = PX_PER_MINUTE_WEEK;
  const weekHeight = (weekGlobalEnd - weekGlobalStart) * PX_PER_MINUTE_WEEK;

  const weekHourSlots = useMemo(() => {
    const slots: number[] = [];
    for (let m = weekGlobalStart; m <= weekGlobalEnd; m += SLOT_STEP) slots.push(m);
    return slots;
  }, [weekGlobalStart, weekGlobalEnd]);

  useEffect(() => {
    if (agendaView === "week" && weekDays.length === 7) {
      loadWeekData(weekDays[0], weekDays[6]);
    }
  }, [agendaView, weekDays[0]]);

  useEffect(() => {
    const interval = setInterval(() => {
      const n = new Date();
      setNowMinutes(n.getHours() * 60 + n.getMinutes());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getWeekDaySegments = (dateKey: string): VisualAppointmentSegment[] => {
    const dayAppts = weekAppointments.filter(
      (a) => a.appointment_date === dateKey && (!selectedStaffId || !a.staff_id || a.staff_id === selectedStaffId)
    );
    const items: VisualAppointmentSegment[] = [];
    for (const appointment of dayAppts) {
      const busySegments = getAppointmentBusySegments(appointment);
      const hasBreak = busySegments.length === 2;
      busySegments.forEach((seg, index) => {
        const top = (seg.start - weekGlobalStart) * pxPerMinuteWeek;
        const realHeight = (seg.end - seg.start) * pxPerMinuteWeek;
        const height = Math.max(realHeight, 28);
        items.push({
          id: `${appointment.id}-${index + 1}`,
          appointmentId: appointment.id,
          top,
          height,
          appointment,
          label: `${minutesToLabel(seg.start)} → ${minutesToLabel(seg.end)}`,
          isSecondPart: index === 1,
          showPauseBadge: hasBreak && index === 0,
          sizeMode: "small",
          column: 0,
          totalColumns: 1,
        });
      });
    }
    return assignColumns(items.sort((a, b) => a.top - b.top));
  };

  const renderAgendaCard = (segment: VisualAppointmentSegment) => {
    const isSmall = segment.sizeMode === "small";
    const isLarge = segment.sizeMode === "large";
    const clientName = `${segment.appointment.clients?.first_name ?? ""} ${segment.appointment.clients?.last_name ?? ""}`.trim() || "Sans nom";
    const clientId = segment.appointment.clients?.id ?? segment.appointment.client_id ?? null;

    const colLeft = `calc(${(segment.column / segment.totalColumns) * 100}% + ${segment.column === 0 ? 16 : 4}px)`;
    const colRight = `calc(${((segment.totalColumns - segment.column - 1) / segment.totalColumns) * 100}% + ${segment.column === segment.totalColumns - 1 ? 16 : 4}px)`;

    return (
      <button
        key={segment.id}
        type="button"
        onClick={() => openAppointmentModal(segment.appointment)}
        className={`absolute overflow-hidden rounded-[22px] border text-left shadow-[0_12px_28px_rgba(70,48,22,0.08)] transition hover:z-10 hover:scale-[1.006] hover:shadow-[0_18px_38px_rgba(70,48,22,0.12)] ${getCategoryCardClasses(
          segment.appointment.services?.categories?.name
        )} ${
          isSmall ? "px-3 py-2" : isLarge ? "px-4 py-4" : "px-4 py-3"
        }`}
        style={{
          top: segment.top,
          height: segment.height,
          left: colLeft,
          right: colRight,
          ...getCategoryCardStyle(segment.appointment.services?.categories?.color),
        }}
      >
        <div className={`grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-x-3 ${isSmall ? "mb-1" : "mb-2"}`}>
          <div
            className={`hidden md:block shrink-0 font-semibold uppercase text-[var(--gold)] ${
              isSmall
                ? "text-[13px] tracking-[0.08em]"
                : isLarge
                ? "text-[16px] tracking-[0.10em]"
                : "text-[15px] tracking-[0.09em]"
            }`}
          >
            {segment.label}
          </div>

          <h3
            className={`min-w-0 md:truncate whitespace-normal break-words md:text-center font-semibold leading-tight col-span-3 md:col-span-1 ${
              isSmall ? "text-[11px] md:text-[16px]" : isLarge ? "text-[14px] md:text-[24px]" : "text-[12px] md:text-[20px]"
            }`}
          >
            {segment.appointment.services?.name ?? "Prestation"}
          </h3>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (clientId) loadClientDetails(clientId);
            }}
            className={`hidden md:block min-w-0 truncate text-right font-medium underline decoration-[var(--gold)] underline-offset-4 transition hover:text-[var(--gold)] ${
              isSmall ? "text-[14px]" : isLarge ? "text-[18px]" : "text-[17px]"
            }`}
          >
            {clientName}
          </button>
        </div>

      </button>
    );
  };

  const colorPageBg = settings?.color_page_bg || "#ffffff";
  const colorHeaderBg = settings?.color_header_bg || "#ffffff";
  const colorTextMain = settings?.color_text_main || "#111827";
  const colorSalonName = settings?.color_salon_name || colorTextMain;
  const colorCardBorder = settings?.color_card_border || "#e5e7eb";
  const colorAccents = settings?.color_accents || "#4f46e5";
  const colorNavText = settings?.color_nav_text || "#111827";
  const colorPanelBg = derivePanelBg(colorPageBg);
  const colorPanelBgSecondary = derivePanelBgSecondary(colorPageBg);
  const salonDisplayName = (settings?.salon_name || "Votre salon").replace(/[\u0027\u2018\u2019\u201B]/g, "'");

  const accentRgb = hexToRgb(colorAccents);
  const accentRgbStr = accentRgb ? `${accentRgb.r},${accentRgb.g},${accentRgb.b}` : "216,166,70";
  const colorSelectedBg = colorAccents;
  const colorSelectedText = contrastText(colorSelectedBg);
  const bgPatternLayer = getPatternBgLayer(settings?.bg_pattern, colorPageBg);

  return (
    <main
      className="min-h-screen"
      style={{ color: colorTextMain, background: `${bgPatternLayer ? bgPatternLayer + "," : ""}radial-gradient(circle at top left, rgba(${accentRgbStr},0.10), transparent 34%), ${colorPageBg}` }}
    >
      <style>{`:root { --gold: ${colorAccents}; --card-border: ${colorCardBorder}; --nav-text: ${colorNavText}; --text-main: ${colorTextMain}; --page-bg: ${colorPageBg}; --accents: ${colorAccents}; --panel-bg: ${colorPanelBg}; --panel-bg-secondary: ${colorPanelBgSecondary}; --selected-bg: ${colorSelectedBg}; --selected-text: ${colorSelectedText}; }`}</style>
      <SiteFont font={settings?.site_font} salonNameFont={settings?.font_salon_name} />
      <SitePattern pattern={settings?.bg_pattern} />
      <header
        className="relative md:sticky top-0 z-30 shadow-[0_14px_45px_rgba(80,55,25,0.10)] backdrop-blur-md"
        style={{ borderBottom: `1px solid ${colorCardBorder}88`, background: `linear-gradient(to bottom, ${colorHeaderBg}d8, ${colorHeaderBg}f4)` }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}99, transparent)` }} />
          <div className="absolute inset-0" style={{ background: `radial-gradient(ellipse at 50% 130%, ${colorAccents}28, transparent 55%)` }} />
          <div className="header-sweep absolute inset-y-0 w-1/3" style={{ background: `linear-gradient(to right, transparent, ${colorAccents}28, transparent)` }} />
        </div>
        <div className="mx-auto flex w-[min(1400px,calc(100%-24px))] items-center justify-between gap-3 py-3 md:py-4">
          <div className="flex items-center gap-3">
            {settings?.logo_pro_image_url && (
              <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[18px] border shadow-[0_12px_26px_rgba(185,139,61,0.18)] md:h-14 md:w-14 md:rounded-[22px]" style={{ borderColor: colorCardBorder, backgroundColor: colorPageBg }}>
                <img
                  src={settings.logo_pro_image_url}
                  alt={`${salonDisplayName} Pro`}
                  className="h-full w-full object-cover"
                />
              </div>
            )}

            <div>
              <div className="inline-flex rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.28em] md:text-[11px]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Back office
              </div>
              <div className="mt-0.5 text-xl font-semibold leading-none md:mt-1 md:text-3xl">
                <SalonNameGradient name={salonDisplayName} goldColor={colorSalonName} /> Pro
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5 md:flex md:items-center md:justify-end md:gap-2">
            <Link
              href="/back-office"
              className="rounded-xl bg-[var(--selected-bg)] px-3 py-2 text-xs font-semibold text-[var(--selected-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:opacity-90 md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Agenda
            </Link>

            <Link
              href="/back-office/clients"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Fiches clients
            </Link>

            <Link
              href="/back-office/gestion"
              className="rounded-xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-3 py-2 text-xs font-semibold text-[var(--nav-text)] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Admin
            </Link>



            <button
              type="button"
              onClick={handleLogout}
              className="rounded-xl border border-[#f0d5cd] bg-[#fff5f2] px-3 py-2 text-xs font-semibold text-[#a33a3a] shadow-sm transition hover:-translate-y-1 hover:scale-[1.08] hover:bg-[var(--panel-bg)] md:rounded-2xl md:px-4 md:py-3 md:text-sm"
            >
              Déconnexion
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto w-[min(1400px,calc(100%-24px))] py-5 md:py-8">
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-[310px_1fr] lg:items-start">
        <aside className="order-1 flex flex-col gap-4 lg:order-none md:gap-6 lg:sticky lg:top-5">
        <div className="rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-6 shadow-[0_18px_45px_rgba(80,55,25,0.07)]">
            <div className="mb-3 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Navigation
            </div>

            <div className="flex items-center justify-between gap-2 mb-4">
              <button
                type="button"
                onClick={handleCalPrevMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-main)] transition hover:border-[var(--gold)] hover:shadow-sm active:scale-95"
              >
                &#8249;
              </button>
              <span className="text-base font-semibold capitalize text-[var(--text-main)]">
                {MONTH_NAMES[calMonth]} {calYear}
              </span>
              <button
                type="button"
                onClick={handleCalNextMonth}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-main)] transition hover:border-[var(--gold)] hover:shadow-sm active:scale-95"
              >
                &#8250;
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {DAY_NAMES.map((name) => (
                <div key={name} className="text-center text-[10px] font-bold uppercase tracking-wide text-[#9a8f83]">
                  {name}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: calStartPadding }).map((_, i) => (
                <div key={`pad-${i}`} className="aspect-square" />
              ))}
              {calDays.map((dateKey) => {
                const dayNum = Number(dateKey.split("-")[2]);
                const isSelected = selectedDate === dateKey;
                const isToday = dateKey === getTodayKey();
                const isClosed = !isOpenDayFromSettings(dateKey, settings);

                return (
                  <button
                    key={dateKey}
                    type="button"
                    onClick={() => setSelectedDate(dateKey)}
                    disabled={isClosed}
                    className={`relative aspect-square rounded-xl border text-xs font-semibold transition duration-150 active:scale-95 ${
                      isSelected
                        ? "border-[var(--selected-bg)] bg-[var(--selected-bg)] text-[var(--selected-text)] shadow-md"
                        : isClosed
                          ? "cursor-not-allowed border-transparent bg-[#f5f0ea] text-[#c5bbb2]"
                          : "border-transparent bg-[var(--panel-bg)] text-[var(--text-main)] hover:border-[#d8b56d] hover:bg-[var(--panel-bg)]"
                    }`}
                  >
                    {dayNum}
                    {isToday && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--gold)]" />
                    )}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => {
                const today = getTodayKey();
                setSelectedDate(today);
                const now = new Date();
                setCalYear(now.getFullYear());
                setCalMonth(now.getMonth());
              }}
              className="mt-4 w-full rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] py-2.5 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]"
            >
              {"Aujourd’hui"}
            </button>

            <p className="mt-3 text-sm text-[var(--nav-text)]">{selectedDate ? formatFrenchDate(selectedDate) : ""}</p>
            <p className="mt-1 text-sm text-[var(--nav-text)]">
              Horaires : {settings?.opening_time?.slice(0, 5) || "09:00"} {"->"}{" "}
              {settings?.closing_time?.slice(0, 5) || "19:00"}
            </p>

            {staff.length > 0 && (
              <div className="mt-4">
                <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>Prestataire</div>
                <div className="flex flex-wrap gap-2">
                  {staff.map((member) => (
                    <button
                      key={member.id}
                      type="button"
                      onClick={() => setSelectedStaffId(member.id)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition ${selectedStaffId === member.id ? "ring-2 ring-[var(--accents)]" : "border border-[var(--card-border)] bg-white text-[var(--nav-text)] hover:bg-[var(--page-bg)]"}`}
                      style={selectedStaffId === member.id ? { backgroundColor: member.color, color: contrastText(member.color) } : {}}
                    >
                      {member.first_name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {dayHasAllDayClosure ? (
              <div className="mt-4 rounded-[16px] border border-[#efd7d7] bg-[#fff8f8] px-4 py-3 text-sm text-[#a33a3a]">
                Fermeture exceptionnelle toute la journée
              </div>
            ) : null}
        </div>

        <div className="rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-6 shadow-[0_18px_45px_rgba(80,55,25,0.07)]">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Action
            </div>
            <h2 className="text-3xl">Ajout rapide</h2>

            <div className="mt-5 grid gap-3">
              <button
                type="button"
                disabled={dayHasAllDayClosure}
                onClick={() =>
                  openCreateModal(selectedDate, "")
                }
                className="rounded-2xl bg-[var(--selected-bg)] px-4 py-3 font-semibold text-[var(--selected-text)] shadow-[0_10px_24px_rgba(31,27,23,0.15)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Ajouter un rendez-vous
              </button>
            </div>
        </div>

        <div className="rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-6 shadow-[0_18px_45px_rgba(80,55,25,0.07)]">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Résumé
            </div>
            <h2 className="text-3xl">RDV du jour</h2>

            <div className="mt-5 grid gap-3">
              <div className="flex justify-between gap-4 border-b border-[var(--card-border)] pb-3 text-[var(--nav-text)]">
                <strong className="text-[var(--text-main)]">Total</strong>
                <span>{stats.total}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-[var(--card-border)] pb-3 text-[var(--nav-text)]">
                <strong className="text-[var(--text-main)]">À venir</strong>
                <span>{stats.upcoming}</span>
              </div>
              <div className="flex justify-between gap-4 text-[var(--nav-text)]">
                <strong className="text-[var(--text-main)]">Passés</strong>
                <span>{stats.past}</span>
              </div>
            </div>
        </div>
        </aside>
        <section className="rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-6 shadow-[0_18px_45px_rgba(80,55,25,0.07)]">
          <div className="mb-4 flex items-center justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Agenda
              </div>
              {agendaView === "day" ? (
                <h2 className="text-[44px] font-semibold leading-none">{formatFrenchDate(selectedDate)}</h2>
              ) : (
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, -7))} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] text-lg transition hover:bg-[var(--panel-bg)]">‹</button>
                  <h2 className="text-2xl font-semibold leading-none">
                    {parseDateKey(weekDays[0]).toLocaleDateString("fr-FR", { day: "numeric", month: "short" })}
                    {" → "}
                    {parseDateKey(weekDays[6]).toLocaleDateString("fr-FR", { day: "numeric", month: "short", year: "numeric" })}
                  </h2>
                  <button type="button" onClick={() => setSelectedDate(addDays(selectedDate, 7))} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] text-lg transition hover:bg-[var(--panel-bg)]">›</button>
                </div>
              )}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <div className="flex rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] p-1">
                <button
                  type="button"
                  onClick={() => setAgendaView("day")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${agendaView === "day" ? "bg-[var(--selected-bg)] text-[var(--selected-text)] shadow-sm" : "text-[var(--nav-text)] hover:bg-[var(--page-bg)]"}`}
                >
                  Jour
                </button>
                <button
                  type="button"
                  onClick={() => setAgendaView("week")}
                  className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${agendaView === "week" ? "bg-[var(--selected-bg)] text-[var(--selected-text)] shadow-sm" : "text-[var(--nav-text)] hover:bg-[var(--page-bg)]"}`}
                >
                  Semaine
                </button>
              </div>
              {hasSmsConfigured && (
                <div className="flex items-center rounded-full border border-[var(--card-border)]/60 bg-[var(--panel-bg)] px-4 py-2 text-sm">
                  {smsCredits === null ? (
                    <span className="text-xs text-[var(--nav-text)] opacity-40">…</span>
                  ) : smsCredits.provider === "brevo" ? (
                    <span className={`font-bold ${(smsCredits.smsCount ?? 0) < 50 ? "text-red-500" : "text-green-600"}`}>
                      {smsCredits.smsCount ?? "—"} SMS
                    </span>
                  ) : smsCredits.provider === "twilio" ? (
                    <span className="font-bold text-green-600">
                      {smsCredits.balance} {smsCredits.currency}
                    </span>
                  ) : (
                    <span className={`font-bold ${(smsCredits.creditsLeft ?? 0) < 50 ? "text-red-500" : "text-green-600"}`}>
                      {smsCredits.creditsLeft ?? "—"} SMS
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {agendaView === "week" ? (
            <div className="rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]" style={{ overflowX: "auto", overflowY: "clip" }}>
              {loadingWeek ? (
                <div className="px-6 py-10 text-center text-sm text-[var(--nav-text)]">Chargement...</div>
              ) : (
                <div style={{ minWidth: 320 }}>
                  {(() => {
                    const openDays = weekDays.filter((dk) => isOpenDayFromSettings(dk, settings));
                    const cols = `64px repeat(${openDays.length}, 1fr)`;
                    const dayNames = ["Dim", "Lun", "Mar", "Mer", "Jeu", "Ven", "Sam"];
                    return (
                      <>
                  {/* En-têtes jours */}
                  <div className="grid border-b border-[#efe6db]" style={{ gridTemplateColumns: cols }}>
                    <div className="bg-[#fbf6ef]" />
                    {openDays.map((dk) => {
                      const d = parseDateKey(dk);
                      const isToday = dk === getTodayKey();
                      const isSelected = dk === selectedDate;
                      const dayClosures = weekExceptionClosures.filter(c => c.closure_date === dk);
                      const hasAllDayClosure = dayClosures.some(c => c.is_all_day);
                      return (
                        <button
                          key={dk}
                          type="button"
                          onClick={() => { setSelectedDate(dk); setAgendaView("day"); }}
                          className={`border-l border-[#efe6db] py-3 text-center transition ${hasAllDayClosure ? "bg-[#fff5f5] hover:bg-[#fff0f0]" : isToday ? "bg-[var(--gold)]/10 hover:bg-[var(--gold)]/15" : "hover:bg-[#f9f3eb]"}`}
                        >
                          <div className={`text-[11px] font-bold uppercase tracking-wider ${isToday ? "text-[var(--gold)]" : "text-[var(--nav-text)]"}`}>{dayNames[d.getDay()]}</div>
                          <div className={`mx-auto mt-1 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold ${isSelected ? "bg-[var(--selected-bg)] text-[var(--selected-text)]" : isToday ? "bg-[var(--selected-bg)] text-[var(--selected-text)]" : "text-[var(--text-main)]"}`}>
                            {d.getDate()}
                          </div>
                          {hasAllDayClosure && (
                            <div className="mt-1 text-[9px] font-bold uppercase tracking-wide text-[#a33a3a]">Fermé</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                  {/* Grille temps */}
                  <div className="grid" style={{ gridTemplateColumns: cols }}>
                    {/* Colonne heures */}
                    <div className="relative border-r border-[#efe6db] bg-[#fbf6ef]" style={{
                      height: weekHeight,
                      backgroundImage: `repeating-linear-gradient(to bottom, transparent 0px, transparent ${SLOT_STEP * pxPerMinuteWeek - 1}px, #efe6db ${SLOT_STEP * pxPerMinuteWeek - 1}px, #efe6db ${SLOT_STEP * pxPerMinuteWeek}px)`,
                      backgroundSize: `100% ${SLOT_STEP * pxPerMinuteWeek}px`,
                    }}>
                      {weekHourSlots.map((slot) => {
                        if (slot % 60 !== 0) return null;
                        return (
                          <div key={slot} className="absolute left-0 right-0 pr-2 text-right" style={{ top: (slot - weekGlobalStart) * pxPerMinuteWeek - 8 }}>
                            <span className="text-sm font-semibold text-[var(--nav-text)]">{minutesToLabel(slot)}</span>
                          </div>
                        );
                      })}
                    </div>
                    {/* Colonnes jours ouverts */}
                    {openDays.map((dk) => {
                      const segs = getWeekDaySegments(dk);
                      const slotPx = SLOT_STEP * pxPerMinuteWeek;
                      const dayClosures = weekExceptionClosures.filter(c => c.closure_date === dk);
                      return (
                        <div
                          key={dk}
                          className="relative border-l border-[#efe6db]"
                          style={{ height: weekHeight, backgroundColor: dk === getTodayKey() ? colorPanelBgSecondary : colorPanelBg }}
                        >
                          {/* Créneaux cliquables */}
                          {weekHourSlots.map((slot) => {
                            if (slot === weekGlobalEnd) return null;
                            const top = (slot - weekGlobalStart) * pxPerMinuteWeek;
                            const slotBlocked = isBlockedByExceptionalClosure(slot, slot + SLOT_STEP, dayClosures);
                            return (
                              <button
                                key={slot}
                                type="button"
                                disabled={slotBlocked}
                                onClick={() => openCreateModal(dk, minutesToLabel(slot))}
                                className={`absolute left-0 right-0 border-t transition ${slotBlocked ? "border-[#f1d7d7] bg-[#fff5f5] cursor-not-allowed" : "border-[#f0e7dc] hover:bg-[#f4ede3]"}`}
                                style={{ top, height: slotPx }}
                              />
                            );
                          })}
                          {/* Fermetures exceptionnelles */}
                          {dayClosures
                            .filter((closure) => !closure.is_all_day && closure.start_time && closure.end_time)
                            .map((closure) => {
                              const start = parseTimeToMinutes(closure.start_time!);
                              const end = parseTimeToMinutes(closure.end_time!);
                              const top = (start - weekGlobalStart) * pxPerMinuteWeek;
                              const height = Math.max((end - start) * pxPerMinuteWeek, 28);
                              return (
                                <div
                                  key={closure.id}
                                  className="pointer-events-none absolute left-0.5 right-0.5 z-20 overflow-hidden rounded-xl border border-[#efc9c9] bg-[#fff1f1]/90 px-1.5 py-1 text-[10px] text-[#a33a3a]"
                                  style={{ top, height }}
                                >
                                  <div className="font-semibold leading-tight truncate">Fermeture</div>
                                  {height >= 36 && (
                                    <div className="leading-tight truncate">{`${formatTime(closure.start_time!)} → ${formatTime(closure.end_time!)}`}</div>
                                  )}
                                  {height >= 52 && closure.reason && (
                                    <div className="leading-tight truncate">{closure.reason}</div>
                                  )}
                                </div>
                              );
                            })}
                          {/* Ligne heure actuelle */}
                          {dk === getTodayKey() && nowMinutes >= weekGlobalStart && nowMinutes <= weekGlobalEnd && (
                            <div
                              className="pointer-events-none absolute left-0 right-0 z-20 flex items-center"
                              style={{ top: (nowMinutes - weekGlobalStart) * pxPerMinuteWeek - 1 }}
                            >
                              <div className="h-2 w-2 shrink-0 rounded-full bg-red-500" />
                              <div className="h-[2px] flex-1 bg-red-500" />
                            </div>
                          )}

                          {/* Cartes RDV */}
                          {segs.map((seg) => {
                            const clientName = `${seg.appointment.clients?.first_name ?? ""} ${seg.appointment.clients?.last_name ?? ""}`.trim() || "—";
                            const cardStyle = getCategoryCardStyle(seg.appointment.services?.categories?.color);
                            return (
                              <button
                                key={seg.id}
                                type="button"
                                onClick={() => openAppointmentModal(seg.appointment)}
                                onMouseEnter={() => setHoveredWeekSegId(seg.id)}
                                onMouseLeave={() => setHoveredWeekSegId(null)}
                                className={`absolute overflow-hidden rounded-xl border px-1.5 py-1 text-left text-[11px] shadow-sm transition-shadow ${getCategoryCardClasses(seg.appointment.services?.categories?.name)} ${hoveredWeekSegId === seg.id ? "z-50 shadow-lg scale-[1.15]" : "z-10"}`}
                                style={{
                                  top: seg.top,
                                  height: hoveredWeekSegId === seg.id ? "auto" : seg.height,
                                  minHeight: seg.height,
                                  left: `calc(${(seg.column / seg.totalColumns) * 100}% + ${seg.column === 0 ? 2 : 1}px)`,
                                  right: `calc(${((seg.totalColumns - seg.column - 1) / seg.totalColumns) * 100}% + ${seg.column === seg.totalColumns - 1 ? 2 : 1}px)`,
                                  ...cardStyle,
                                }}
                              >
                                <div className="font-bold leading-tight" style={{ color: "var(--gold)" }}>
                                  {seg.label.split(" → ")[0]}<span className="font-normal text-[var(--text-main)]"> · {clientName}</span>
                                </div>
                                {(seg.height >= 42 || hoveredWeekSegId === seg.id) && (
                                  <div className={`break-words leading-tight text-[var(--nav-text)] ${hoveredWeekSegId === seg.id ? "text-[12px] font-bold" : ""}`}>{seg.appointment.services?.name}</div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          ) : !isOpenDayFromSettings(selectedDate, settings) ? (
            <div className="rounded-[24px] border border-dashed border-[#d7cabb] bg-white px-6 py-12 text-center text-[var(--nav-text)]">
              Le salon est fermé ce jour-là.
            </div>
          ) : dayHasAllDayClosure ? (
            <div className="rounded-[24px] border border-dashed border-[#efd7d7] bg-white px-6 py-12 text-center text-[#a33a3a]">
              Fermeture exceptionnelle sur toute la journée.
            </div>
          ) : statusMessage ? (
            <>
              <div className="mb-5 rounded-[16px] border border-[#c7e0ce] bg-[#f5fbf6] px-4 py-3 text-sm text-[#1f6a3a]">
                {statusMessage}
              </div>

              {loading ? (
                <div className="rounded-[20px] border border-dashed border-[#d7cabb] bg-white px-6 py-10 text-center text-[var(--nav-text)]">
                  Chargement de l’agenda...
                </div>
              ) : (
                <div className="overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
                  <div className="grid grid-cols-[80px_1fr]">
                    <div className="border-r border-[#efe6db] bg-[#fbf6ef]" />
                    <div />
                  </div>

                  <div className="grid grid-cols-[80px_1fr]">
                    <div
                      className="relative border-r border-[#efe6db] bg-[#fbf6ef]"
                      style={{ height: dayHeight }}
                    >
                      {hourSlots.map((slot) => {
                        if (slot === dayEnd || slot % 30 !== 0) return null;
                        const top = (slot - dayStart) * PX_PER_MINUTE;

                        return (
                          <div key={slot} className="absolute left-0 right-0 pr-2 text-right" style={{ top: top - 8 }}>
                            <span className="text-sm font-semibold text-[var(--nav-text)]">{minutesToLabel(slot)}</span>
                          </div>
                        );
                      })}
                    </div>

                    <div className="relative bg-[var(--panel-bg)]" style={{ height: dayHeight }}>
                      {hourSlots.map((slot) => {
                        if (slot === dayEnd) return null;
                        const slotStart = slot;
                        const slotEnd = slot + SLOT_STEP;
                        const top = (slot - dayStart) * PX_PER_MINUTE;
                        const slotBlocked = isBlockedByExceptionalClosure(slotStart, slotEnd, exceptionClosures)
                          || (staffBreakBlock !== null && selectedStaffScheduleToday?.has_break && selectedStaffScheduleToday.break_start && selectedStaffScheduleToday.break_end
                            ? slotStart < parseTimeToMinutes(selectedStaffScheduleToday.break_end.slice(0,5)) && slotEnd > parseTimeToMinutes(selectedStaffScheduleToday.break_start.slice(0,5))
                            : false);

                        return (
                          <div
                            key={slot}
                            className={`absolute left-0 right-0 border-t ${
                              slotBlocked ? "border-[#f1d7d7] bg-[#fff5f5]" : "border-[#f0e7dc]"
                            }`}
                            style={{ top, height: SLOT_STEP * PX_PER_MINUTE }}
                          >
                            <button
                              type="button"
                              disabled={slotBlocked}
                              onClick={() => openCreateModal(selectedDate, minutesToLabel(slot))}
                              className={`h-full w-full text-left transition ${
                                slotBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-[#f9f3eb]"
                              }`}
                            />
                          </div>
                        );
                      })}

                      {staffBreakBlock && (
                        <div
                          className="pointer-events-none absolute left-4 right-4 rounded-[18px] border border-[#e8d9b8] bg-[#fdf6e8]/90 p-2 text-xs text-[#9a7d3a]"
                          style={{ top: staffBreakBlock.top, height: staffBreakBlock.height }}
                        >
                          <div className="font-semibold">Pause · {staffBreakBlock.label}</div>
                        </div>
                      )}

                      {closureBlocks.map((closure) => (
                        <div
                          key={closure.id}
                          className="pointer-events-none absolute left-4 right-4 rounded-[18px] border border-[#efc9c9] bg-[#fff1f1]/90 p-3 text-sm text-[#a33a3a]"
                          style={{
                            top: closure.top,
                            height: closure.height,
                          }}
                        >
                          <div className="font-semibold">Fermeture exceptionnelle</div>
                          <div>
                            {closure.start_time && closure.end_time
                              ? `${formatTime(closure.start_time)} → ${formatTime(closure.end_time)}`
                              : "Créneau fermé"}
                          </div>
                          {closure.reason ? <div>{closure.reason}</div> : null}
                        </div>
                      ))}

                      {visualAppointmentSegments.map((segment) => renderAgendaCard(segment))}

                      {selectedDate === getTodayKey() && nowMinutes >= dayStart && nowMinutes <= dayEnd && (
                        <div
                          className="pointer-events-none absolute left-2 right-2 z-20 flex items-center"
                          style={{ top: (nowMinutes - dayStart) * PX_PER_MINUTE - 1 }}
                        >
                          <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                          <div className="h-[2px] flex-1 bg-red-500" />
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          ) : loading ? (
            <div className="rounded-[20px] border border-dashed border-[#d7cabb] bg-white px-6 py-10 text-center text-[var(--nav-text)]">
              Chargement de l’agenda...
            </div>
          ) : (
            <div className="overflow-hidden rounded-[28px] border border-[var(--card-border)] bg-[var(--panel-bg)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
              <div className="grid grid-cols-[80px_1fr]">
                <div className="border-r border-[#efe6db] bg-[#fbf6ef]" />
                <div />
              </div>

              <div className="grid grid-cols-[80px_1fr]">
                <div
                  className="relative border-r border-[#efe6db] bg-[#fbf6ef]"
                  style={{ height: dayHeight }}
                >
                  {hourSlots.map((slot) => {
                    if (slot === dayEnd || slot % 30 !== 0) return null;
                    const top = (slot - dayStart) * PX_PER_MINUTE;

                    return (
                      <div key={slot} className="absolute left-0 right-0 pr-2 text-right" style={{ top: top - 8 }}>
                        <span className="text-sm font-semibold text-[var(--nav-text)]">{minutesToLabel(slot)}</span>
                      </div>
                    );
                  })}
                </div>

                <div className="relative bg-[var(--panel-bg)]" style={{ height: dayHeight }}>
                  {hourSlots.map((slot) => {
                    if (slot === dayEnd) return null;
                    const slotStart = slot;
                    const slotEnd = slot + SLOT_STEP;
                    const top = (slot - dayStart) * PX_PER_MINUTE;
                    const slotBlocked = isBlockedByExceptionalClosure(slotStart, slotEnd, exceptionClosures)
                      || (staffBreakBlock !== null && selectedStaffScheduleToday?.has_break && selectedStaffScheduleToday.break_start && selectedStaffScheduleToday.break_end
                        ? slotStart < parseTimeToMinutes(selectedStaffScheduleToday.break_end.slice(0,5)) && slotEnd > parseTimeToMinutes(selectedStaffScheduleToday.break_start.slice(0,5))
                        : false);

                    return (
                      <div
                        key={slot}
                        className={`absolute left-0 right-0 border-t ${
                          slotBlocked ? "border-[#f1d7d7] bg-[#fff5f5]" : "border-[#f0e7dc]"
                        }`}
                        style={{ top, height: SLOT_STEP * PX_PER_MINUTE }}
                      >
                        <button
                          type="button"
                          disabled={slotBlocked}
                          onClick={() => openCreateModal(selectedDate, minutesToLabel(slot))}
                          className={`h-full w-full text-left transition ${
                            slotBlocked ? "cursor-not-allowed opacity-60" : "hover:bg-[#f9f3eb]"
                          }`}
                        />
                      </div>
                    );
                  })}

                  {closureBlocks.map((closure) => (
                    <div
                      key={closure.id}
                      className="pointer-events-none absolute left-4 right-4 rounded-[18px] border border-[#efc9c9] bg-[#fff1f1]/90 p-3 text-sm text-[#a33a3a]"
                      style={{
                        top: closure.top,
                        height: closure.height,
                      }}
                    >
                      <div className="font-semibold">Fermeture exceptionnelle</div>
                      <div>
                        {closure.start_time && closure.end_time
                          ? `${formatTime(closure.start_time)} → ${formatTime(closure.end_time)}`
                          : "Créneau fermé"}
                      </div>
                      {closure.reason ? <div>{closure.reason}</div> : null}
                    </div>
                  ))}

                  {visualAppointmentSegments.map((segment) => renderAgendaCard(segment))}

                  {selectedDate === getTodayKey() && nowMinutes >= dayStart && nowMinutes <= dayEnd && (
                    <div
                      className="pointer-events-none absolute left-2 right-2 z-20 flex items-center"
                      style={{ top: (nowMinutes - dayStart) * PX_PER_MINUTE - 1 }}
                    >
                      <div className="h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" />
                      <div className="h-[2px] flex-1 bg-red-500" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
        </div>
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--text-main)]/45 p-5 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-4xl rounded-[34px] border border-[var(--card-border)] bg-[#fffaf4] p-8 shadow-[0_30px_80px_rgba(31,27,23,0.20)]">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                    Ajout manuel
                  </div>
                  <h2 className="text-4xl">Nouveau rendez-vous</h2>
                  <p className="mt-3 text-[var(--nav-text)]">
                    {formatFrenchDate(createDate)} • {createTime}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]"
                  >
                    Fermer
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCreateAppointment()}
                    disabled={savingCreate}
                    className="rounded-2xl bg-[var(--selected-bg)] px-5 py-3 font-semibold text-[var(--selected-text)] shadow-[0_10px_24px_rgba(31,27,23,0.15)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
                  >
                    {savingCreate ? "Enregistrement..." : "Créer le rendez-vous"}
                  </button>
                </div>

                {createModalError && (
                  <div className="rounded-2xl border border-[#f5c6c6] bg-[#fff5f5] px-4 py-3 text-sm font-medium text-[#a33a3a]">
                    {createModalError}
                  </div>
                )}

                {createOverlapWarning && (
                  <div className="rounded-2xl border border-[#f5e4a0] bg-[#fffbea] px-4 py-3 text-sm text-[#7a5c00]">
                    <p className="font-semibold mb-2">Ce créneau est déjà occupé.</p>
                    <p className="mb-3">Veux-tu créer ce rendez-vous quand même et le superposer ?</p>
                    <button
                      type="button"
                      onClick={() => handleCreateAppointment(true)}
                      disabled={savingCreate}
                      className="rounded-xl bg-[#7a5c00] px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
                    >
                      {savingCreate ? "Enregistrement..." : "Confirmer quand même"}
                    </button>
                  </div>
                )}
              </div>

              <div className="mt-4 grid gap-4">
                <label className="grid gap-2 text-sm text-[var(--nav-text)] md:max-w-[520px]">
                  Catégorie
                  <select
                    value={createCategoryFilter}
                    onChange={(e) => {
                      setCreateCategoryFilter(e.target.value);
                      setCreateServiceId("");
                    }}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                  >
                    <option value="all">Toutes les catégories</option>
                    {categoryOptions.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                  Prestation
                  <select
                    value={createServiceId}
                    onChange={(e) => setCreateServiceId(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                  >
                    <option value="">Choisir une prestation</option>
                    {filteredCreateServiceOptions.map((service) => (
                      <option key={service.id} value={service.id}>
                        {service.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="mt-6 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-sm">
                <div className="mb-3 text-sm font-semibold">Client</div>

                <div className="mb-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCreateClientMode("existing");
                      setCreateClientSearch("");
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      createClientMode === "existing"
                        ? "bg-[var(--selected-bg)] text-[var(--selected-text)]"
                        : "border border-black/10 bg-white"
                    }`}
                  >
                    Client existant
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCreateClientMode("new");
                      setCreateExistingClientId("");
                      setCreateClientSearch("");
                    }}
                    className={`rounded-full px-4 py-2 text-sm font-medium ${
                      createClientMode === "new"
                        ? "bg-[var(--selected-bg)] text-[var(--selected-text)]"
                        : "border border-black/10 bg-white"
                    }`}
                  >
                    Nouveau client
                  </button>
                </div>

                {createClientMode === "existing" ? (
                  <div className="grid gap-3 text-sm text-[var(--nav-text)]">
                    <label className="grid gap-2">
                      Rechercher un client
                      <input
                        type="text"
                        value={createClientSearch}
                        onChange={(e) => {
                          setCreateClientSearch(e.target.value);
                          if (createExistingClientId) setCreateExistingClientId("");
                        }}
                        placeholder="Nom, prénom ou téléphone"
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      />
                    </label>

                    {selectedExistingClient ? (
                      <div className="rounded-[16px] border border-[#d8eadf] bg-[#f7fcf8] px-4 py-3 text-[#1f6a3a]">
                        <div className="text-sm font-semibold">Client sélectionné</div>
                        <div className="mt-1 text-sm">
                          {selectedExistingClient.first_name} {selectedExistingClient.last_name} •{" "}
                          {selectedExistingClient.phone}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setCreateExistingClientId("");
                            setCreateClientSearch("");
                          }}
                          className="mt-3 rounded-full border border-[#cfe5d6] bg-white px-3 py-1.5 text-xs font-medium text-[#1f6a3a]"
                        >
                          Changer de client
                        </button>
                      </div>
                    ) : createClientSearch.trim().length === 0 ? (
                      <div className="rounded-[16px] border border-dashed border-[var(--card-border)] bg-[#fcfaf7] px-4 py-3 text-sm text-[var(--nav-text)]">
                        Commence à taper un nom ou un numéro pour afficher les résultats.
                      </div>
                    ) : filteredExistingClients.length === 0 ? (
                      <div className="rounded-[16px] border border-dashed border-[var(--card-border)] bg-[#fcfaf7] px-4 py-3 text-sm text-[var(--nav-text)]">
                        Aucun résultat.
                      </div>
                    ) : (
                      <div className="max-h-64 overflow-y-auto rounded-[16px] border border-[var(--card-border)] bg-white">
                        {filteredExistingClients.map((client) => (
                          <button
                            key={client.id}
                            type="button"
                            onClick={() => {
                              setCreateExistingClientId(client.id);
                              setCreateClientSearch(
                                `${client.first_name} ${client.last_name} • ${client.phone}`.trim()
                              );
                            }}
                            className="flex w-full items-center justify-between gap-3 border-b border-[var(--card-border)] px-4 py-3 text-left text-sm text-[var(--text-main)] last:border-b-0 hover:bg-[#fcfaf7]"
                          >
                            <span className="font-medium">
                              {client.first_name} {client.last_name}
                            </span>
                            <span className="text-[var(--nav-text)]">{client.phone}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="grid gap-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                        Prénom
                        <input
                          type="text"
                          value={createFirstName}
                          onChange={(e) => setCreateFirstName(e.target.value)}
                          className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                        Nom
                        <input
                          type="text"
                          value={createLastName}
                          onChange={(e) => setCreateLastName(e.target.value)}
                          className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                        />
                      </label>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                        Téléphone <span className="font-normal opacity-60">(optionnel)</span>
                        <input
                          type="tel"
                          value={createPhone}
                          onChange={(e) => setCreatePhone(e.target.value)}
                          placeholder="06 00 00 00 00"
                          className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                        E-mail
                        <input
                          type="email"
                          value={createEmail}
                          onChange={(e) => setCreateEmail(e.target.value)}
                          className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                        />
                      </label>
                    </div>

                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Notes client
                      <textarea
                        value={createClientNotes}
                        onChange={(e) => setCreateClientNotes(e.target.value)}
                        className="min-h-[90px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      />
                    </label>
                  </div>
                )}
              </div>

              <div className="mt-6 grid gap-6 md:grid-cols-2">
                <div className="grid gap-2 text-sm text-[var(--nav-text)]">
                  <span className="font-medium">Date</span>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
                    <div className="mb-3 flex items-center justify-between">
                      <button type="button" onClick={() => { if (modalCalMonth === 0) { setModalCalYear(y => y - 1); setModalCalMonth(11); } else setModalCalMonth(m => m - 1); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-white text-sm transition hover:bg-[var(--page-bg)]">‹</button>
                      <span className="font-semibold text-[var(--text-main)]">{MONTH_NAMES[modalCalMonth]} {modalCalYear}</span>
                      <button type="button" onClick={() => { if (modalCalMonth === 11) { setModalCalYear(y => y + 1); setModalCalMonth(0); } else setModalCalMonth(m => m + 1); }} className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--card-border)] bg-white text-sm transition hover:bg-[var(--page-bg)]">›</button>
                    </div>
                    <div className="grid grid-cols-7 text-center text-[11px] font-bold uppercase tracking-wider text-[var(--gold)] mb-2">
                      {["L","M","M","J","V","S","D"].map((d, i) => <span key={i}>{d}</span>)}
                    </div>
                    <div className="grid grid-cols-7 gap-y-1 text-center text-sm">
                      {Array.from({ length: (new Date(modalCalYear, modalCalMonth, 1).getDay() + 6) % 7 }).map((_, i) => <span key={i} />)}
                      {Array.from({ length: new Date(modalCalYear, modalCalMonth + 1, 0).getDate() }, (_, d) => {
                        const dk = `${modalCalYear}-${String(modalCalMonth + 1).padStart(2, "0")}-${String(d + 1).padStart(2, "0")}`;
                        const isSelected = createDate === dk;
                        const now2 = new Date();
                        const todayStr = `${now2.getFullYear()}-${String(now2.getMonth()+1).padStart(2,"0")}-${String(now2.getDate()).padStart(2,"0")}`;
                        const isToday = dk === todayStr;
                        const isClosed = !isOpenDayFromSettings(dk, settings);
                        return (
                          <button key={dk} type="button" onClick={() => setCreateDate(dk)}
                            className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition ${isSelected ? "bg-[var(--selected-bg)] text-[var(--selected-text)]" : isClosed ? "text-[#c4b8a8] line-through" : isToday ? "border border-[var(--gold)] text-[var(--gold)]" : "hover:bg-[var(--page-bg)] text-[var(--text-main)]"}`}>
                            {d + 1}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid gap-2 text-sm text-[var(--nav-text)]">
                  <span className="font-medium">Heure de début</span>
                  <div className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] p-4 shadow-sm">
                    <div className="flex flex-wrap gap-2">
                      {Array.from({ length: Math.floor((createDayEnd - createDayStart) / 15) }, (_, i) => {
                        const mins = createDayStart + i * 15;
                        const h = String(Math.floor(mins / 60)).padStart(2, "0");
                        const m = String(mins % 60).padStart(2, "0");
                        const label = `${h}:${m}`;
                        const isSelected = createTime === label;

                        // Calcul disponibilité si une prestation est sélectionnée
                        let isUnavailable = false;
                        if (selectedCreateService) {
                          const segs = getServiceSegmentsFromService(selectedCreateService, mins);
                          if (segs.totalEnd > createDayEnd) {
                            isUnavailable = true;
                          } else {
                            // Bloquer si créneau pendant pause de la prestataire
                            if (createStaffSchedule?.has_break && createStaffSchedule.break_start && createStaffSchedule.break_end) {
                              const bStart = parseTimeToMinutes(createStaffSchedule.break_start.slice(0,5));
                              const bEnd = parseTimeToMinutes(createStaffSchedule.break_end.slice(0,5));
                              if (segs.segment1Start < bEnd && segs.totalEnd > bStart) {
                                isUnavailable = true;
                              }
                            }
                            if (!isUnavailable) {
                              const blockedByRdv = allKnownAppointmentsForCreate.some((apt) => {
                                if (apt.appointment_date !== createDate) return false;
                                if (createStaffId && apt.staff_id && apt.staff_id !== createStaffId) return false;
                                const busy = getAppointmentBusySegments(apt);
                                return busy.some((seg) =>
                                  overlaps(segs.segment1Start, segs.segment1End, seg.start, seg.end)
                                ) || (segs.after > 0 && busy.some((seg) =>
                                  overlaps(segs.segment2Start, segs.segment2End, seg.start, seg.end)
                                ));
                              });
                              const blockedByClosure = isBlockedByExceptionalClosure(segs.segment1Start, segs.segment1End, createDateClosures)
                                || (segs.after > 0 && isBlockedByExceptionalClosure(segs.segment2Start, segs.segment2End, createDateClosures));
                              isUnavailable = blockedByRdv || blockedByClosure;
                            }
                          }
                        }

                        return (
                          <button key={label} type="button"
                            onClick={() => { if (!isUnavailable) setCreateTime(label); }}
                            disabled={isUnavailable}
                            title={isUnavailable ? "Créneau indisponible" : label}
                            className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                              isSelected
                                ? "bg-[var(--selected-bg)] text-[var(--selected-text)]"
                                : isUnavailable
                                  ? "border border-[#e8e0d8] bg-[#f5f2ee] text-[#c4b8a8] line-through cursor-not-allowed opacity-60"
                                  : "border border-[var(--card-border)] bg-white text-[var(--text-main)] hover:bg-[var(--page-bg)]"
                            }`}>
                            {label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-4">
                {staff.length > 0 && (
                  <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                    Prestataire
                    <select
                      value={createStaffId}
                      onChange={(e) => setCreateStaffId(e.target.value)}
                      className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                    >
                      <option value="">Pas de préférence</option>
                      {staff.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.first_name}
                        </option>
                      ))}
                    </select>
                  </label>
                )}

                <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                  Message client
                  <textarea
                    value={createMessage}
                    onChange={(e) => setCreateMessage(e.target.value)}
                    className="min-h-[90px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                  />
                </label>

                <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                  Note interne
                  <textarea
                    value={createInternalNote}
                    onChange={(e) => setCreateInternalNote(e.target.value)}
                    className="min-h-[90px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {showAppointmentModal && selectedAppointment ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--text-main)]/45 p-5 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-3xl rounded-[30px] border border-[var(--card-border)] bg-[#fcfaf7] p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
              <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                    Détail du rendez-vous
                  </div>
                </div>

                {!isEditingAppointment ? (
                  <button
                    type="button"
                    onClick={closeAppointmentModal}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]"
                  >
                    Fermer
                  </button>
                ) : null}
              </div>

              {!isEditingAppointment ? (
                <>
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h2 className="text-4xl">
                        {selectedAppointment.services?.name ?? "Prestation"}
                      </h2>
                      <p className="mt-2 text-[var(--nav-text)]">
                        {formatFrenchDate(selectedAppointment.appointment_date)} •{" "}
                        {formatTime(selectedAppointment.start_time)} →{" "}
                        {formatTime(selectedAppointment.end_time)}
                      </p>
                      {selectedAppointment.break_start_time && selectedAppointment.break_end_time ? (
                        <p className="mt-1 text-sm text-[#a77722]">
                          Pause : {formatTime(selectedAppointment.break_start_time)} →{" "}
                          {formatTime(selectedAppointment.break_end_time)}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Cliente / client</strong>
                      {selectedAppointment.clients ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (selectedAppointment.clients?.id) {
                              closeAppointmentModal();
                              loadClientDetails(selectedAppointment.clients.id);
                            }
                          }}
                          className="mt-2 block text-left text-sm text-[var(--text-main)] underline decoration-[var(--gold)] underline-offset-4"
                        >
                          {selectedAppointment.clients.first_name}{" "}
                          {selectedAppointment.clients.last_name}
                        </button>
                      ) : (
                        <span className="mt-2 block text-sm text-[var(--nav-text)]">—</span>
                      )}
                    </div>

                    <div className="rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Téléphone</strong>
                      <span className="mt-2 block text-sm text-[var(--nav-text)]">
                        {selectedAppointment.clients?.phone ?? "—"}
                      </span>
                    </div>

                    <div className="rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Catégorie</strong>
                      <span className="mt-2 block text-sm text-[var(--nav-text)]">
                        {selectedAppointment.services?.categories?.name ?? "Sans catégorie"}
                      </span>
                    </div>

                    <div className="rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Tarif</strong>
                      <span className="mt-2 block text-sm text-[var(--nav-text)]">
                        {formatPrice(selectedAppointment.price_cents)}
                      </span>
                    </div>
                  </div>

                  {selectedAppointment.client_message ? (
                    <div className="mt-4 rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Message client</strong>
                      <p className="mt-2 text-sm text-[var(--nav-text)]">
                        {selectedAppointment.client_message}
                      </p>
                    </div>
                  ) : null}

                  {selectedAppointment.internal_note ? (
                    <div className="mt-4 rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Note interne</strong>
                      <p className="mt-2 text-sm text-[var(--nav-text)]">
                        {selectedAppointment.internal_note}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap justify-end gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditingAppointment(true)}
                      className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]"
                    >
                      Modifier
                    </button>

                    {confirmCancelAppointment ? (
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[#efd7d7] bg-[#fff8f8] px-4 py-2">
                        <span className="text-sm font-medium text-[#a33a3a]">Confirmer l'annulation ?</span>
                        <button
                          type="button"
                          disabled={updatingId === selectedAppointment.id}
                          onClick={async () => {
                            await handleStatusChange(selectedAppointment.id, "cancelled");
                            setConfirmCancelAppointment(false);
                            closeAppointmentModal();
                          }}
                          className="rounded-xl bg-[#a33a3a] px-4 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50"
                        >
                          {updatingId === selectedAppointment.id ? "Annulation..." : "Oui, annuler"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmCancelAppointment(false)}
                          className="rounded-xl border border-[var(--card-border)] bg-white px-4 py-2 text-sm font-medium hover:bg-[var(--panel-bg)]"
                        >
                          Non
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmCancelAppointment(true)}
                        className="rounded-2xl bg-[var(--selected-bg)] px-5 py-3 font-semibold text-[var(--selected-text)] shadow-[0_10px_24px_rgba(31,27,23,0.15)] transition hover:-translate-y-0.5 hover:opacity-90"
                      >
                        Annuler le RDV
                      </button>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h2 className="text-4xl">Modifier le rendez-vous</h2>
                      <p className="mt-2 text-[var(--nav-text)]">
                        Le rendez-vous se replacera automatiquement dans l’agenda.
                      </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => setIsEditingAppointment(false)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]"
                      >
                        Retour
                      </button>

                      <button
                        type="button"
                        onClick={handleSaveAppointmentEdit}
                        disabled={savingEditAppointment}
                        className="rounded-2xl bg-[var(--selected-bg)] px-5 py-3 font-semibold text-[var(--selected-text)] shadow-[0_10px_24px_rgba(31,27,23,0.15)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50"
                      >
                        {savingEditAppointment
                          ? "Enregistrement..."
                          : "Enregistrer les modifications"}
                      </button>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Date
                      <input
                        type="date"
                        value={editAppointmentDate}
                        onChange={(e) => setEditAppointmentDate(e.target.value)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Heure de début
                      <input
                        type="time"
                        step={900}
                        value={editAppointmentTime}
                        onChange={(e) => setEditAppointmentTime(e.target.value)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      />
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="grid gap-2 text-sm text-[var(--nav-text)] md:max-w-[520px]">
                      Catégorie
                      <select
                        value={editCategoryFilter}
                        onChange={(e) => {
                          setEditCategoryFilter(e.target.value);
                          setEditAppointmentServiceId("");
                        }}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      >
                        <option value="all">Toutes les catégories</option>
                        {categoryOptions.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Prestation
                      <select
                        value={editAppointmentServiceId}
                        onChange={(e) => setEditAppointmentServiceId(e.target.value)}
                        className="w-full rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      >
                        <option value="">Choisir une prestation</option>
                        {filteredEditServiceOptions.map((service) => (
                          <option key={service.id} value={service.id}>
                            {service.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="mt-4 grid gap-4">
                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Message client
                      <textarea
                        value={editAppointmentMessage}
                        onChange={(e) => setEditAppointmentMessage(e.target.value)}
                        className="min-h-[90px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      />
                    </label>

                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Note interne
                      <textarea
                        value={editAppointmentInternalNote}
                        onChange={(e) => setEditAppointmentInternalNote(e.target.value)}
                        className="min-h-[90px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10"
                      />
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {selectedClient ? (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-[var(--text-main)]/45 p-5 backdrop-blur-md">
          <div className="flex min-h-full items-center justify-center">
            <div className="w-full max-w-5xl rounded-[30px] border border-[var(--card-border)] bg-[#fcfaf7] p-8 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">

              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Fiche client</div>
                  <h2 className="text-4xl">{selectedClient.first_name} {selectedClient.last_name}</h2>
                  <p className="mt-3 text-[var(--nav-text)]">
                    {selectedClient.phone}{selectedClient.email ? ` • ${selectedClient.email}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button type="button" onClick={closeClientModal}
                    className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]">
                    Fermer
                  </button>
                  {!isEditingClient && (
                    <button type="button" onClick={openClientEdit}
                      className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]">
                      Modifier
                    </button>
                  )}
                  <a href={`tel:${selectedClient.phone}`}
                    className="rounded-2xl bg-[var(--selected-bg)] px-5 py-3 font-semibold text-[var(--selected-text)] shadow-[0_10px_24px_rgba(31,27,23,0.15)] transition hover:-translate-y-0.5 hover:opacity-90">
                    Appeler le client
                  </a>
                </div>
              </div>

              {isEditingClient ? (
                <div className="grid gap-4">
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Prénom
                      <input type="text" value={editClientFirstName} onChange={(e) => setEditClientFirstName(e.target.value)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10" />
                    </label>
                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Nom
                      <input type="text" value={editClientLastName} onChange={(e) => setEditClientLastName(e.target.value)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10" />
                    </label>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      Téléphone
                      <input type="tel" value={editClientPhone} onChange={(e) => setEditClientPhone(e.target.value)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10" />
                    </label>
                    <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                      E-mail
                      <input type="email" value={editClientEmail} onChange={(e) => setEditClientEmail(e.target.value)}
                        className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10" />
                    </label>
                  </div>
                  <label className="grid gap-2 text-sm text-[var(--nav-text)]">
                    Notes
                    <textarea value={editClientNotes} onChange={(e) => setEditClientNotes(e.target.value)}
                      className="min-h-[90px] rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[var(--gold)]/10" />
                  </label>
                  <div className="flex flex-wrap gap-3">
                    <button type="button" onClick={() => setIsEditingClient(false)}
                      className="rounded-2xl border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)]">
                      Annuler
                    </button>
                    <button type="button" onClick={handleSaveClient} disabled={savingClient}
                      className="rounded-2xl bg-[var(--selected-bg)] px-5 py-3 font-semibold text-[var(--selected-text)] shadow-[0_10px_24px_rgba(31,27,23,0.15)] transition hover:-translate-y-0.5 hover:opacity-90 disabled:opacity-50">
                      {savingClient ? "Enregistrement..." : "Enregistrer"}
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {selectedClient.notes ? (
                    <div className="mb-6 rounded-[18px] border border-[var(--card-border)] bg-white p-4">
                      <strong>Notes</strong>
                      <p className="mt-2 text-sm text-[var(--nav-text)]">{selectedClient.notes}</p>
                    </div>
                  ) : null}
                  <div className="mt-2">
                    <div className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Historique</div>
                    {loadingClientDetails ? (
                      <div className="rounded-[20px] border border-dashed border-[#d7cabb] bg-white px-6 py-10 text-center text-[var(--nav-text)]">Chargement de l'historique...</div>
                    ) : selectedClientAppointments.length === 0 ? (
                      <div className="rounded-[20px] border border-dashed border-[#d7cabb] bg-white px-6 py-10 text-center text-[var(--nav-text)]">Aucun rendez-vous trouvé.</div>
                    ) : (
                      <div className="grid gap-4">
                        {selectedClientAppointments.map((appointment) => (
                          <article key={appointment.id} className="rounded-[20px] border border-[var(--card-border)] bg-white p-4">
                            <div className="mb-3 flex flex-wrap items-start justify-between gap-3">
                              <div>
                                <h3 className="text-xl">{appointment.services?.name ?? "Prestation"}</h3>
                                <p className="mt-1 text-sm text-[var(--nav-text)]">{appointment.services?.categories?.name ?? "Sans catégorie"}</p>
                              </div>
                              <span className={`rounded-full border px-3 py-2 text-sm font-semibold ${getBadgeClasses(appointment.status)}`}>
                                {getStatusLabel(appointment.status)}
                              </span>
                            </div>
                            <div className="grid gap-3 md:grid-cols-4">
                              <div className="rounded-[16px] border border-[var(--card-border)] bg-[#fcfaf7] p-3"><strong>Date</strong><span className="mt-2 block text-sm text-[var(--nav-text)]">{formatFrenchDate(appointment.appointment_date)}</span></div>
                              <div className="rounded-[16px] border border-[var(--card-border)] bg-[#fcfaf7] p-3"><strong>Heure</strong><span className="mt-2 block text-sm text-[var(--nav-text)]">{formatTime(appointment.start_time)} → {formatTime(appointment.end_time)}</span></div>
                              <div className="rounded-[16px] border border-[var(--card-border)] bg-[#fcfaf7] p-3"><strong>Tarif</strong><span className="mt-2 block text-sm text-[var(--nav-text)]">{formatPrice(appointment.price_cents)}</span></div>
                              <div className="rounded-[16px] border border-[var(--card-border)] bg-[#fcfaf7] p-3"><strong>Statut</strong><span className="mt-2 block text-sm text-[var(--nav-text)]">{getStatusLabel(appointment.status)}</span></div>
                            </div>
                          </article>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}