"use client";

import Link from "next/link";
import { SalonNameGradient } from "@/components/SalonNameGradient";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSalon } from "@/hooks/useSalon";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, getPatternBgLayer } from "@/components/SitePattern";
import {
  formatTime,
  getExceptionalOpening,
  getServiceSegments,
  isOpenDayFromSettings,
  isSlotAvailable,
  parseTime,
  type BusyAppointment,
  type ExceptionClosure,
  type ExceptionOpening,
  type StaffSchedule,
} from "@/lib/availability";

type Service = {
  id: string;
  category: string;
  name: string;
  price: string;
  priceCents: number;
  duration: number;
  durationBeforeBreak: number;
  breakDuration: number;
  durationAfterBreak: number;
};

type ServiceRow = {
  id: string;
  name: string;
  price_cents: number;
  duration_minutes: number;
  duration_before_break: number | null;
  break_duration: number | null;
  duration_after_break: number | null;
  categories: { name: string } | { name: string }[] | null;
};

type Slot = {
  label: string;
  available: boolean;
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
  color_page_bg?: string | null;
  color_contact_bg?: string | null;
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

type StaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
};

type QuestionRow = {
  id: string;
  question: string;
  display_order: number;
};

type BookedAppointmentSummary = {
  serviceName: string;
  dateLabel: string;
  time: string;
};

const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];
const DAY_SLUGS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;
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

function makeLocalDate(year: number, monthIndex: number, day: number) {
  return new Date(year, monthIndex, day, 12, 0, 0, 0);
}

function toKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;
}

function formatPgTimeFromLabel(str: string) {
  return `${str}:00`;
}

function normalizePhoneInput(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

function formatDateLabel(date: Date) {
  return `${dayNamesFull[date.getDay()]} ${date.getDate()} ${monthNames[date.getMonth()]}`;
}

function getDaysInMonth(year: number, monthIndex: number) {
  const arr: Date[] = [];
  const daysCount = new Date(year, monthIndex + 1, 0).getDate();
  for (let d = 1; d <= daysCount; d++) {
    arr.push(makeLocalDate(year, monthIndex, d));
  }
  return arr;
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


export function ReservationClient({ initialSettings }: { initialSettings: SalonSettings | null }) {
  const { id: salonId } = useSalon();
  const settings = initialSettings;
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [orderedCategories, setOrderedCategories] = useState<string[]>([]);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedDateLabel, setSelectedDateLabel] = useState<string>("--");
  const [selectedTime, setSelectedTime] = useState<string>("--:--");
  const [busyAppointments, setBusyAppointments] = useState<BusyAppointment[]>(
    [],
  );
  const [exceptionClosures, setExceptionClosures] = useState<ExceptionClosure[]>([]);
  const [exceptionOpenings, setExceptionOpenings] = useState<ExceptionOpening[]>([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isKnownClient, setIsKnownClient] = useState(false);
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);

  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const [bookedAppointments, setBookedAppointments] = useState<BookedAppointmentSummary[]>([]);

  const serviceSectionRef = useRef<HTMLElement | null>(null);
  const dateSectionRef = useRef<HTMLElement | null>(null);
  const staffSectionRef = useRef<HTMLElement | null>(null);
  const slotSectionRef = useRef<HTMLElement | null>(null);
  const contactSectionRef = useRef<HTMLElement | null>(null);

  const scrollToSection = (ref: React.RefObject<HTMLElement | null>) => {
    window.setTimeout(() => {
      ref.current?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
    }, 120);
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const res = await fetch("/api/public/booking-options");
      const json = await res.json();

      if (!res.ok) {
        setServicesError(json.error ?? "Impossible de charger les prestations.");
        setLoadingServices(false);
        return;
      }

      const categoriesData = (json.categories ?? []) as { name: string }[];
      const names = categoriesData.map((c) => c.name);
      setOrderedCategories(names);
      if (names.length > 0) setCategoryFilter(names[0]);

      const mapped: Service[] =
        (json.services as ServiceRow[] | undefined)?.map((item) => {
          const durationBeforeBreak =
            item.duration_before_break ?? item.duration_minutes ?? 0;
          const breakDuration = item.break_duration ?? 0;
          const durationAfterBreak = item.duration_after_break ?? 0;
          const totalDuration =
            durationBeforeBreak + breakDuration + durationAfterBreak;

          return {
            id: item.id,
            name: item.name,
            price: `${(item.price_cents / 100).toFixed(2).replace(".00", "")} €`,
            priceCents: item.price_cents,
            duration: totalDuration,
            durationBeforeBreak,
            breakDuration,
            durationAfterBreak,
            category: (Array.isArray(item.categories) ? item.categories[0]?.name : item.categories?.name) ?? "Sans catégorie",
          };
        }) ?? [];

      setServices(mapped);

      if (mapped.length > 0) {
        setSelectedService(mapped[0]);
      }

      setLoadingServices(false);

      const staffList = (json.staff ?? []) as StaffRow[];
      setStaff(staffList);
      if (staffList.length === 1) setSelectedStaffId(staffList[0].id);

      setStaffSchedules((json.staffSchedules ?? []) as StaffSchedule[]);
      setQuestions((json.questions ?? []) as QuestionRow[]);
      setExceptionOpenings((json.exceptionOpenings ?? []) as ExceptionOpening[]);
    };

    loadInitialData();
  }, [salonId]);

  const openingMinutes = useMemo(() => {
    const exOpening = getExceptionalOpening(selectedDateKey, exceptionOpenings);
    if (exOpening) return parseTime(exOpening.opening_time.slice(0, 5));
    if (!settings) return parseTime("09:00");
    const dow = selectedDateKey ? new Date(selectedDateKey + "T12:00:00").getDay() : 1;
    const slug = DAY_SLUGS[dow];
    const t = (settings[`opening_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5)
      ?? settings.opening_time?.slice(0, 5)
      ?? "09:00";
    return parseTime(t);
  }, [settings, selectedDateKey, exceptionOpenings]);
  const closingMinutes = useMemo(() => {
    const exOpening = getExceptionalOpening(selectedDateKey, exceptionOpenings);
    if (exOpening) return parseTime(exOpening.closing_time.slice(0, 5));
    if (!settings) return parseTime("19:00");
    const dow = selectedDateKey ? new Date(selectedDateKey + "T12:00:00").getDay() : 1;
    const slug = DAY_SLUGS[dow];
    const t = (settings[`closing_time_${slug}` as keyof SalonSettings] as string | null)?.slice(0, 5)
      ?? settings.closing_time?.slice(0, 5)
      ?? "19:00";
    return parseTime(t);
  }, [settings, selectedDateKey, exceptionOpenings]);

  const displayedCategories = useMemo(() => {
    return orderedCategories.length > 0
      ? orderedCategories.filter((cat) => services.some((s) => s.category === cat))
      : [...new Set(services.map((s) => s.category))];
  }, [orderedCategories, services]);

  // S'il n'y a qu'une seule catégorie (ou aucune), inutile de faire choisir —
  // on va directement aux prestations, sans filtrer par catégorie.
  const showCategoryStep = displayedCategories.length > 1;
  const stepCategory = showCategoryStep ? 1 : 0;

  const filteredServices = useMemo(() => {
    if (!showCategoryStep || categoryFilter === "all") return services;
    return services.filter((service) => service.category === categoryFilter);
  }, [categoryFilter, services, showCategoryStep]);

  const now = new Date();
  const todayKey = toKey(makeLocalDate(now.getFullYear(), now.getMonth(), now.getDate()));

  const [calendarYear, setCalendarYear] = useState(now.getFullYear());
  const [calendarMonth, setCalendarMonth] = useState(now.getMonth());

  const calendarDays = useMemo(
    () => getDaysInMonth(calendarYear, calendarMonth),
    [calendarYear, calendarMonth],
  );

  const canGoPrev = calendarYear > now.getFullYear() || calendarMonth > now.getMonth();

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (calendarMonth === 0) {
      setCalendarYear((y) => y - 1);
      setCalendarMonth(11);
    } else {
      setCalendarMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (calendarMonth === 11) {
      setCalendarYear((y) => y + 1);
      setCalendarMonth(0);
    } else {
      setCalendarMonth((m) => m + 1);
    }
  };

  const loadDayData = async (appointmentDate: string) => {
    const res = await fetch(`/api/public/busy-appointments?date=${appointmentDate}`);
    const json = await res.json();

    if (!res.ok) {
      throw new Error(json.error ?? "Impossible de charger les créneaux.");
    }

    const rows = (json.appointments ?? []) as BusyAppointment[];
    const closures = (json.closures ?? []) as ExceptionClosure[];
    setBusyAppointments(rows);
    setExceptionClosures(closures);
    return [rows, closures] as const;
  };


  const selectedStaffMember = useMemo(
    () => staff.find((m) => m.id === selectedStaffId) ?? null,
    [staff, selectedStaffId]
  );

  const getStaffScheduleForDate = (staffId: string, dateKey: string): StaffSchedule | null => {
    if (!dateKey) return null;
    const dow = new Date(dateKey + "T12:00:00").getDay();
    return staffSchedules.find((s) => s.staff_id === staffId && s.day_of_week === dow) ?? null;
  };

  // Schedule de la prestataire sélectionnée pour la date choisie.
  // Ignoré sur un jour d'ouverture exceptionnelle : le planning jour-de-semaine
  // ne s'applique pas, les horaires de l'ouverture servent directement.
  const selectedStaffSchedule = useMemo(() => {
    if (!selectedStaffId || !selectedDateKey) return null;
    if (getExceptionalOpening(selectedDateKey, exceptionOpenings)) return null;
    return getStaffScheduleForDate(selectedStaffId, selectedDateKey);
  }, [selectedStaffId, selectedDateKey, staffSchedules, exceptionOpenings]);

  const effectiveOpeningMinutes = useMemo(() => {
    if (!selectedStaffSchedule) return openingMinutes;
    return Math.max(openingMinutes, parseTime(selectedStaffSchedule.opening_time.slice(0, 5)));
  }, [selectedStaffSchedule, openingMinutes]);

  const effectiveClosingMinutes = useMemo(() => {
    if (!selectedStaffSchedule) return closingMinutes;
    return Math.min(closingMinutes, parseTime(selectedStaffSchedule.closing_time.slice(0, 5)));
  }, [selectedStaffSchedule, closingMinutes]);

  const currentSlots = useMemo(() => {
    const duration = selectedService?.duration ?? 30;
    const allSlots = getAllSlots(duration, effectiveOpeningMinutes, effectiveClosingMinutes);

    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const isToday = selectedDateKey === todayKey;

    return allSlots.map((slot) => {
      const slotStart = parseTime(slot.label);
      const isPast = isToday && slotStart <= currentMinutes;

      let available: boolean;

      const exOpening = getExceptionalOpening(selectedDateKey, exceptionOpenings);
      if (!selectedStaffId && staff.length > 1) {
        available = !isPast && staff.some((member) => {
          const sched = getStaffScheduleForDate(member.id, selectedDateKey);
          // Ouverture exceptionnelle : le planning jour-de-semaine n'empêche pas le staff de travailler.
          if (!exOpening && (!sched || !sched.is_open)) return false;
          const memberOpen = exOpening ? parseTime(exOpening.opening_time.slice(0, 5)) : parseTime(sched!.opening_time.slice(0, 5));
          const memberClose = exOpening ? parseTime(exOpening.closing_time.slice(0, 5)) : parseTime(sched!.closing_time.slice(0, 5));
          const segs = getServiceSegments(selectedService, slotStart);
          if (segs.totalEnd > memberClose || slotStart < memberOpen) return false;
          const memberAppts = busyAppointments.filter((a) => a.staff_id === member.id || a.staff_id === null);
          return isSlotAvailable(slotStart, selectedService, memberAppts, exceptionClosures, memberClose, exOpening ? null : sched, null);
        });
      } else {
        available = !isPast && isSlotAvailable(
          slotStart,
          selectedService,
          busyAppointments,
          exceptionClosures,
          effectiveClosingMinutes,
          selectedStaffSchedule,
          selectedStaffId || null,
        );
      }

      return { ...slot, available };
    });
  }, [
    selectedService,
    busyAppointments,
    exceptionClosures,
    effectiveOpeningMinutes,
    effectiveClosingMinutes,
    selectedDateKey,
    todayKey,
    selectedStaffId,
    selectedStaffSchedule,
    staff,
    staffSchedules,
  ]);

  const handleSelectDate = async (date: Date) => {
    const key = toKey(date);
    setSelectedDateKey(key);
    setSelectedDateLabel(formatDateLabel(date));
    scrollToSection(slotSectionRef);

    try {
      await loadDayData(key);
      setSelectedTime("--:--");
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible de charger les créneaux."}`,
      );
    }
  };

  const handlePhoneChange = async (value: string) => {
    const normalizedPhone = normalizePhoneInput(value);
    setPhone(normalizedPhone);

    if (normalizedPhone.length < 10) {
      setIsKnownClient(false);
      return;
    }

    try {
      const res = await fetch("/api/reservation/lookup-client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizedPhone }),
      });
      const json = await res.json();

      if (!res.ok || !json.exists) {
        setIsKnownClient(false);
        setAnswers({});
        return;
      }

      setFirstName(json.firstName ?? "");
      setLastName(json.lastName ?? "");
      setEmail(json.email ?? "");
      setIsKnownClient(true);
      setAnswers(json.lastAnswers ?? {});
    } catch {
      setIsKnownClient(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const digitsOnly = phone.replace(/\D/g, "");

    if (digitsOnly.length !== 10) {
      setStatus("Le numéro de téléphone doit contenir exactement 10 chiffres.");
      setShowConfirmation(false);
      return;
    }

    if (!selectedService) {
      setStatus("Aucune prestation disponible pour le moment.");
      setShowConfirmation(false);
      return;
    }

    if (!selectedDateKey || selectedTime === "--:--") {
      setStatus("Merci de choisir une date et un créneau disponible.");
      setShowConfirmation(false);
      return;
    }

    if (questions.length > 0) {
      const unanswered = questions.filter((q) => !answers[q.id]?.trim());
      if (unanswered.length > 0) {
        setStatus("Merci de répondre à toutes les questions du questionnaire avant de confirmer.");
        setShowConfirmation(false);
        return;
      }
    }

    try {
      setSaving(true);
      setStatus("");

      const normalizedPhone = digitsOnly;
      const appointmentDate = selectedDateKey;
      const startMinutes = parseTime(selectedTime);
      const segments = getServiceSegments(selectedService, startMinutes);

      const [rows, closures] = await loadDayData(appointmentDate);

      const stillAvailable = isSlotAvailable(
        startMinutes,
        selectedService,
        rows,
        closures,
        effectiveClosingMinutes,
        getStaffScheduleForDate(selectedStaffId, appointmentDate),
        selectedStaffId || null,
      );

      if (!stillAvailable) {
        setStatus("Ce créneau n’est plus disponible. Choisis-en un autre.");
        setSaving(false);
        return;
      }

      const startTime = formatPgTimeFromLabel(
        formatTime(segments.segment1Start),
      );
      const endTime = formatPgTimeFromLabel(formatTime(segments.totalEnd));
      const breakStartTime =
        segments.pause > 0
          ? formatPgTimeFromLabel(formatTime(segments.breakStart))
          : null;
      const breakEndTime =
        segments.pause > 0
          ? formatPgTimeFromLabel(formatTime(segments.breakEnd))
          : null;

      // Assignation automatique si "Pas de préférence" et plusieurs prestataires
      let assignedStaffId: string | null = selectedStaffId || null;

      if (!assignedStaffId && staff.length > 0) {
        const availableStaff = staff.filter((member) => {
          const sched = getStaffScheduleForDate(member.id, appointmentDate);
          if (!sched || !sched.is_open) return false;
          const memberOpenMin = parseTime(sched.opening_time.slice(0, 5));
          const memberCloseMin = parseTime(sched.closing_time.slice(0, 5));
          if (startMinutes < memberOpenMin || segments.totalEnd > memberCloseMin) return false;
          // Bloquer si pendant la pause
          if (sched.has_break && sched.break_start && sched.break_end) {
            const bStart = parseTime(sched.break_start.slice(0, 5));
            const bEnd = parseTime(sched.break_end.slice(0, 5));
            if (startMinutes < bEnd && segments.totalEnd > bStart) return false;
          }
          const memberRows = rows.filter((r) => r.staff_id === member.id);
          return isSlotAvailable(startMinutes, selectedService, memberRows, closures, memberCloseMin, sched, null);
        });

        if (availableStaff.length > 0) {
          // Choisir celle qui a le moins de minutes réservées ce jour
          const staffLoad = availableStaff.map((member) => {
            const totalMinutes = rows
              .filter((r) => r.staff_id === member.id && r.status !== "cancelled")
              .reduce((acc, r) => {
                const start = parseInt(r.start_time.split(":")[0]) * 60 + parseInt(r.start_time.split(":")[1]);
                const end = parseInt(r.end_time.split(":")[0]) * 60 + parseInt(r.end_time.split(":")[1]);
                return acc + (end - start);
              }, 0);
            return { id: member.id, load: totalMinutes };
          });
          staffLoad.sort((a, b) => a.load - b.load);
          assignedStaffId = staffLoad[0].id;
        }
      }

      const answersPayload = questions.map((q) => ({
        questionId: q.id,
        questionText: q.question,
        answer: answers[q.id]?.trim() ?? "",
      }));

      const bookRes = await fetch("/api/reservation/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: normalizedPhone,
          firstName,
          lastName,
          email,
          message,
          serviceId: selectedService.id,
          priceCents: selectedService.priceCents,
          appointmentDate,
          startTime,
          endTime,
          breakStartTime,
          breakEndTime,
          staffId: assignedStaffId,
          answers: answersPayload,
        }),
      });
      const bookJson = await bookRes.json();

      if (!bookRes.ok) {
        setStatus(bookJson.error ?? "Impossible d'enregistrer le rendez-vous.");
        setShowConfirmation(false);
        setSaving(false);
        return;
      }

      setStatus("Rendez-vous confirmé ✅");
      setShowConfirmation(true);
      setBookedAppointments((prev) => [
        ...prev,
        { serviceName: selectedService.name, dateLabel: selectedDateLabel, time: selectedTime },
      ]);

      const phoneDigits = phone.replace(/\D/g, "");
      let toPhone: string;
      if (phoneDigits.startsWith("0033")) {
        toPhone = `+33${phoneDigits.slice(4)}`;
      } else if (phoneDigits.startsWith("33") && phoneDigits.length === 11) {
        toPhone = `+${phoneDigits}`;
      } else if (phoneDigits.startsWith("0") && phoneDigits.length === 10) {
        toPhone = `+33${phoneDigits.slice(1)}`;
      } else {
        toPhone = `+${phoneDigits}`;
      }
      fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: toPhone,
          firstName,
          serviceName: selectedService.name,
          date: appointmentDate,
          time: selectedTime,
        }),
      }).catch(() => {});

      await loadDayData(appointmentDate);
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible d'enregistrer le rendez-vous."}`,
      );
      setShowConfirmation(false);
    } finally {
      setSaving(false);
    }
  };

  const handleBookAnother = () => {
    setShowConfirmation(false);
    setStatus("");
    setSelectedService(null);
    setSelectedDateKey("");
    setSelectedDateLabel("--");
    setSelectedTime("--:--");
    setSelectedStaffId(staff.length === 1 ? staff[0].id : "");
    setMessage("");
    setAnswers({});
    scrollToSection(serviceSectionRef);
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
          --text-on-main: ${contrastText(colorTextMain)};
          --text-on-accent: ${colorButtonsText};
          --accents: ${colorAccents};
          --page-bg: ${colorPageBg};
          --panel-bg: ${colorPanelBg};
        }
      `}</style>
      <div className="pointer-events-none fixed -left-24 top-20 h-72 w-72 rounded-full bg-[var(--accents)]/20 blur-3xl" />
      <div className="pointer-events-none fixed -right-28 top-72 h-80 w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />
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
        <div className="mx-auto flex w-[min(1200px,calc(100%-28px))] items-center justify-between gap-4 py-3">
          <Link href="/" className="group flex items-center gap-3">
            {logoUrl && (
              <div className="h-11 w-11 shrink-0 flex items-center justify-center overflow-hidden rounded-[18px] border border-[var(--card-border)] bg-[var(--page-bg)] shadow-[0_12px_26px_rgba(185,139,61,0.18)] sm:h-14 sm:w-14 sm:rounded-[22px]">
                <img src={logoUrl} alt={salonName} className="h-full w-full object-cover" />
              </div>
            )}
            <span>
              <span className="block text-2xl leading-none tracking-tight sm:text-3xl">
                <SalonNameGradient name={salonName} goldColor={colorSalonName} />
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--text-secondary)]">
                Réservation en ligne
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[var(--card-border)]/70 bg-[var(--panel-bg)] px-4 py-2 text-sm font-semibold text-[var(--nav-text)] transition hover:-translate-y-0.5 hover:bg-[var(--panel-bg)] hover:shadow-[0_10px_24px_rgba(80,56,32,0.08)]"
            >
              Accueil
            </Link>
            <Link
              href="/espace-client"
              className="hidden btn-shimmer rounded-full px-4 py-3 text-sm font-semibold transition sm:inline-flex"
              style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 14px 30px rgba(17,17,17,0.18), 0 0 28px 6px ${colorButtons}b3` }}
            >
              Mes réservations
            </Link>
          </div>
        </div>
      </header>

      {bookedAppointments.length > 0 && (
        <div className="mx-auto w-[min(860px,calc(100%-28px))] pt-5">
          <div className="rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_8px_24px_rgba(90,63,30,0.08)]">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                Rendez-vous réservés dans cette session
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = "/"; }}
                className="rounded-full border border-[var(--card-border)] bg-[var(--page-bg)] px-4 py-2 text-sm font-semibold transition hover:shadow-md"
              >
                Terminer
              </button>
            </div>
            <div className="grid gap-2">
              {bookedAppointments.map((rdv, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2 rounded-[14px] border border-[var(--card-border)] bg-[var(--page-bg)] px-4 py-3 text-sm">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold" style={{ backgroundColor: `${colorAccents}20`, color: colorAccents }}>
                    {i + 1}
                  </span>
                  <span className="font-semibold text-[var(--text-main)]">{rdv.serviceName}</span>
                  <span className="text-[var(--text-secondary)]">·</span>
                  <span className="text-[var(--text-secondary)]">{rdv.dateLabel} à {rdv.time}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <section className="mx-auto grid w-[min(860px,calc(100%-28px))] gap-6 py-8 sm:py-10">

        {/* Catégories */}
        {showCategoryStep && (
        <section className="rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6">
          <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
            1 • Catégorie
          </div>
          <h2 className="mb-4 text-2xl font-semibold tracking-tight sm:text-3xl">
            Choisissez une catégorie
          </h2>
          <div className="flex flex-wrap gap-3">
            {displayedCategories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => { setCategoryFilter(cat); scrollToSection(serviceSectionRef); }}
                className={`rounded-full border px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 ${
                  categoryFilter === cat
                    ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[0_10px_22px_rgba(185,139,61,0.18)] text-[var(--text-main)]"
                    : "border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-main)] hover:border-[var(--gold)]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </section>
        )}

        <div className="grid gap-5">
          <section ref={serviceSectionRef} className="scroll-mt-28 rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6">
            <div className="mb-4">
              <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                {stepCategory + 1} • Prestations
              </div>
              <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                Choisissez votre service
              </h2>
            </div>

            {loadingServices ? (
              <p className="text-[var(--text-secondary)]">Chargement des prestations...</p>
            ) : servicesError ? (
              <p className="text-red-600">Erreur : {servicesError}</p>
            ) : filteredServices.length === 0 ? (
              <p className="text-[var(--text-secondary)]">Aucune prestation visible.</p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {filteredServices.map((service) => {
                  const active = selectedService?.id === service.id;

                  return (
                    <button
                      key={service.id}
                      type="button"
                      onClick={() => {
                        setSelectedService(service);
                        scrollToSection(staff.length > 1 ? staffSectionRef : dateSectionRef);
                        if (selectedDateKey) {
                          loadDayData(selectedDateKey).catch(() => {});
                        }
                      }}
                      className={`rounded-[24px] border p-5 text-left shadow-sm transition-all duration-200 ease-out active:scale-[0.95] ${
                        active
                          ? "scale-[1.015] border-[var(--text-main)] bg-[var(--text-main)] text-[var(--text-on-main)] shadow-[0_18px_42px_rgba(43,33,22,0.28)] ring-2 ring-[#d4af37]/35"
                          : "border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-main)] hover:-translate-y-1 hover:scale-[1.015] hover:border-[var(--gold)] hover:shadow-[0_16px_34px_rgba(90,63,30,0.10)]"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl">{service.name}</h3>
                          {active ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--accents)] text-sm font-bold text-[var(--text-on-accent)] shadow-sm">
                              ✓
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`whitespace-nowrap font-semibold ${
                            active ? "text-[var(--gold)]" : "text-[var(--gold)]"
                          }`}
                        >
                          {service.price}
                        </span>
                      </div>
                      <div
                        className={`text-sm ${
                          active ? "text-[var(--text-on-main)]/75" : "text-[var(--text-secondary)]"
                        }`}
                      >
                        {service.duration} min • {service.category}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {staff.length > 1 && (
            <section ref={staffSectionRef} className="scroll-mt-28 rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6">
              <div className="mb-5">
                <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                  {stepCategory + 2} • Prestataire
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choisissez votre prestataire
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                {staff.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStaffId("");
                    scrollToSection(dateSectionRef);
                  }}
                  className={`rounded-[22px] border p-4 text-left shadow-sm transition-all duration-200 active:scale-[0.98] ${
                    selectedStaffId === ""
                      ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[0_16px_34px_rgba(185,139,61,0.16)]"
                      : "border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)]"
                  }`}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--card-border)] bg-gradient-to-br from-[var(--page-bg)] to-[var(--page-bg)] text-lg">
                    ✨
                  </div>
                  <div className="font-semibold">Pas de préférence</div>
                  <div className="mt-1 text-xs text-[var(--text-secondary)]">La première disponible</div>
                </button>
                )}

                {staff.map((member) => (
                  <button
                    key={member.id}
                    type="button"
                    onClick={() => {
                      setSelectedStaffId(member.id);
                      scrollToSection(dateSectionRef);
                    }}
                    className={`rounded-[22px] border p-4 text-left shadow-sm transition-all duration-200 active:scale-[0.98] ${
                      selectedStaffId === member.id
                        ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[0_16px_34px_rgba(185,139,61,0.16)]"
                        : "border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)]"
                    }`}
                  >
                    <div className="font-semibold">{member.first_name}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section ref={dateSectionRef} className="scroll-mt-28 rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                  {stepCategory + (staff.length > 1 ? 1 : 0) + 2} • Date
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choisissez votre date
                </h2>
              </div>
            </div>

            {/* Navigation mois */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={!canGoPrev}
                className={`flex h-9 w-9 items-center justify-center rounded-full border transition duration-200 ${
                  canGoPrev
                    ? "border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-main)] hover:border-[var(--gold)] hover:shadow-md active:scale-95"
                    : "cursor-not-allowed border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-secondary)]"
                }`}
                aria-label="Mois précédent"
              >
                ‹
              </button>

              <span className="text-base font-semibold capitalize text-[var(--text-main)]">
                {monthNames[calendarMonth]} {calendarYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] text-[var(--text-main)] transition duration-200 hover:border-[var(--gold)] hover:shadow-md active:scale-95"
                aria-label="Mois suivant"
              >
                ›
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-2 sm:gap-3">
              {dayNames.map((name) => (
                <div
                  key={name}
                  className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[var(--text-secondary)]"
                >
                  {name}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-2 sm:gap-3">
              {(() => {
                const first = calendarDays[0];
                const startPadding = (first.getDay() + 6) % 7;

                return (
                  <>
                    {Array.from({ length: startPadding }).map((_, index) => (
                      <div
                        key={`pad-${index}`}
                        className="aspect-square min-h-[40px] rounded-2xl bg-[var(--panel-bg)] opacity-50 sm:min-h-[56px]"
                      />
                    ))}

                    {calendarDays.map((date) => {
                      const key = toKey(date);
                      const isPast = key < todayKey;
                      const hasExOpening = !!getExceptionalOpening(key, exceptionOpenings);
                      const closed = !isOpenDayFromSettings(date, settings) && !hasExOpening;
                      // Sur un jour d'ouverture exceptionnelle, le planning jour-de-semaine du staff
                      // ne s'applique pas — le salon a explicitement décidé d'ouvrir ce jour-là.
                      const staffClosed = hasExOpening ? false : (selectedStaffMember ? (() => {
                        const sched = getStaffScheduleForDate(selectedStaffMember.id, key);
                        return sched ? !sched.is_open : true;
                      })() : false);
                      const active = selectedDateKey === key;
                      const isToday = key === todayKey;
                      const disabled = isPast || closed || staffClosed;

                      return (
                        <button
                          key={key}
                          type="button"
                          disabled={disabled}
                          onClick={() => handleSelectDate(date)}
                          className={`relative aspect-square min-h-[40px] rounded-2xl border p-1 text-center transition duration-200 active:scale-95 sm:min-h-[56px] ${
                            disabled
                              ? "cursor-not-allowed border-[var(--card-border)] bg-[var(--page-bg)]/80 text-[var(--text-secondary)]"
                              : active
                                ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[0_16px_34px_rgba(185,139,61,0.16),inset_0_0_0_1px_var(--gold)]"
                                : "border-[var(--card-border)] bg-[var(--panel-bg)] hover:-translate-y-1 hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.10)]"
                          }`}
                        >
                          <div className="flex h-full items-center justify-center text-sm font-bold sm:text-base">
                            {date.getDate()}
                          </div>
                          {isToday && !active && (
                            <span className="absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full bg-[var(--gold)]" />
                          )}
                        </button>
                      );
                    })}
                  </>
                );
              })()}
            </div>
          </section>

          <section ref={slotSectionRef} className="scroll-mt-28 rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                  {stepCategory + (staff.length > 1 ? 1 : 0) + 3} • Créneau
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choisissez votre moment
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Horaires salon :{" "}
                {settings?.opening_time?.slice(0, 5) || "09:00"} à{" "}
                {settings?.closing_time?.slice(0, 5) || "19:00"}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
              {currentSlots.map((slot) => (
                <button
                  key={slot.label}
                  type="button"
                  disabled={!selectedDateKey || !slot.available}
                  onClick={() => {
                    setSelectedTime(slot.label);
                    scrollToSection(contactSectionRef);
                  }}
                  className={`rounded-2xl border px-4 py-3 text-center font-semibold shadow-sm transition duration-200 active:scale-95 ${
                    selectedTime === slot.label
                      ? "border-[var(--gold)] bg-[var(--page-bg)] shadow-[0_16px_34px_rgba(185,139,61,0.16),inset_0_0_0_1px_var(--gold)]"
                      : "border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)]"
                  } ${!selectedDateKey || !slot.available ? "cursor-not-allowed opacity-40" : ""} ${selectedDateKey && !slot.available ? "line-through" : ""}`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </section>

          <section ref={contactSectionRef} className="scroll-mt-28 rounded-[30px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 inline-flex whitespace-nowrap rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
                  {stepCategory + (staff.length > 1 ? 1 : 0) + 4} • Coordonnées
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Confirmez votre rendez-vous
                </h2>
              </div>
              <p className="text-sm text-[var(--text-secondary)]">
                Téléphone obligatoire, e-mail facultatif.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                  Prénom
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="rounded-[16px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[var(--text-main)] outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                  Nom
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="rounded-[16px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[var(--text-main)] outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                  Téléphone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => void handlePhoneChange(e.target.value)}
                    required
                    placeholder="06 00 00 00 00"
                    className="rounded-[16px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[var(--text-main)] outline-none"
                  />
                  {phone.length === 10 ? (
                    <span
                      className={`text-xs ${isKnownClient ? "text-[#1f6a3a]" : "text-[var(--text-secondary)]"}`}
                    >
                      {isKnownClient
                        ? "Client reconnu, les informations ont été préremplies."
                        : "Nouveau client, les informations seront enregistrées à la confirmation."}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                  E-mail (facultatif)
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votreadresse@email.com"
                    className="rounded-[16px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[var(--text-main)] outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm text-[var(--text-secondary)]">
                Message au salon
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Une précision sur votre rendez-vous..."
                  className="min-h-[110px] rounded-[16px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[var(--text-main)] outline-none"
                />
              </label>

              {questions.length > 0 && (
                <div className="grid gap-4 rounded-[24px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-5">
                  <div className="text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">Questionnaire</div>
                  {questions.map((q) => (
                    <label key={q.id} className="grid gap-2 text-sm text-[var(--text-secondary)]">
                      <span>
                        {q.question} <span className="text-rose-500">*</span>
                      </span>
                      <input
                        type="text"
                        value={answers[q.id] ?? ""}
                        onChange={(e) => setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Votre réponse..."
                        className="rounded-[16px] border border-[var(--card-border)] bg-[var(--panel-bg)] px-4 py-3 text-[var(--text-main)] outline-none focus:border-[var(--gold)]"
                      />
                    </label>
                  ))}
                </div>
              )}

              {status ? (
                <div className="rounded-[16px] border border-[#c7e0ce] bg-[#f5fbf6] px-4 py-3 text-sm text-[#1f6a3a]">
                  {status}
                </div>
              ) : null}

              <div className="mt-2 flex flex-col gap-4 rounded-[24px] border border-[var(--card-border)] bg-gradient-to-br from-[var(--page-bg)] to-[var(--page-bg)] p-5 shadow-[0_16px_36px_rgba(185,139,61,0.10)] md:flex-row md:items-center md:justify-between">
                <div>
                  <strong>Rendez-vous prêt à être confirmé</strong>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">
                    {selectedService ? selectedService.category : "—"} •{" "}
                    {selectedService ? selectedService.name : "—"} •{" "}
                    {selectedDateLabel} • {selectedTime} •{" "}
                    {selectedService ? selectedService.price : "—"}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full px-6 py-4 font-semibold transition hover:-translate-y-0.5 disabled:opacity-50"
                  style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 14px 30px rgba(30,20,10,0.18), 0 0 28px 6px ${colorButtons}b3` }}
                >
                  {saving ? "Enregistrement..." : "Confirmer le rendez-vous"}
                </button>
              </div>
            </form>
          </section>
        </div>
      </section>

      {showConfirmation && selectedService ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-5 backdrop-blur-md sm:items-center">
          <div className="my-auto w-full max-w-3xl rounded-[32px] border border-[var(--card-border)] bg-[var(--panel-bg)] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.16)] sm:p-8">
            <div className="mb-2 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}>
              Rendez-vous confirmé
            </div>
            <h2 className="text-4xl">
              Merci, votre réservation est validée ✅
            </h2>
            <p className="mt-3 text-[var(--text-secondary)]">
              Votre rendez-vous a bien été enregistré. Voici votre
              récapitulatif.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Cliente / client</strong>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  {firstName} {lastName}
                </span>
              </div>
              <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Téléphone</strong>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  {phone}
                </span>
              </div>
              <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Prestation</strong>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  {selectedService.name}
                </span>
              </div>
              <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Date et heure</strong>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  {selectedDateLabel} à {selectedTime}
                </span>
              </div>
              <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Tarif</strong>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  {selectedService.price}
                </span>
              </div>
              {selectedStaffId && staff.find((m) => m.id === selectedStaffId) ? (
                <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                  <strong>Prestataire</strong>
                  <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                    {(() => { const m = staff.find((s) => s.id === selectedStaffId); return m ? m.first_name : ""; })()}
                  </span>
                </div>
              ) : null}
              <div className="rounded-[18px] border border-[var(--card-border)] bg-[var(--panel-bg)] hover:border-[var(--gold)] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Salon</strong>
                <span className="mt-2 block text-sm text-[var(--text-secondary)]">
                  {settings?.salon_name || "Votre salon"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleBookAnother}
                className="rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold transition hover:bg-[var(--panel-bg)] hover:shadow-md"
              >
                Prendre un autre rendez-vous
              </button>
              <a
                href="/espace-client"
                className="rounded-full border border-[var(--card-border)] bg-[var(--panel-bg)] px-5 py-3 font-semibold transition hover:bg-[var(--panel-bg)] hover:shadow-md"
              >
                Gérer mon rendez-vous
              </a>
              <a
                href="/"
                className="rounded-full px-5 py-3 font-semibold transition hover:-translate-y-0.5"
                style={{ backgroundColor: colorButtons, color: colorButtonsText, boxShadow: `0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -2px rgba(0,0,0,0.1), 0 0 28px 6px ${colorButtons}b3` }}
              >
                Retour à l’accueil
              </a>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
