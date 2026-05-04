"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { BRAND_NAME } from "@/lib/theme";

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

type RealtimePayload = {
  new?: { appointment_date?: string };
  old?: { appointment_date?: string };
};

type ClientRow = {
  id: string;
};

type ExistingClientRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type BusyAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  status: "confirmed" | "cancelled" | "completed";
  staff_id: string | null;
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
};

type StaffRow = {
  id: string;
  first_name: string;
  last_name: string;
  color: string;
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

function getServiceDurations(service: Service | null) {
  const before = service?.durationBeforeBreak ?? service?.duration ?? 0;
  const pause = service?.breakDuration ?? 0;
  const after = service?.durationAfterBreak ?? 0;
  const total = before + pause + after;

  return {
    before,
    pause,
    after,
    total,
  };
}

function getServiceSegments(service: Service | null, slotStart: number) {
  const { before, pause, after, total } = getServiceDurations(service);

  const segment1Start = slotStart;
  const segment1End = segment1Start + before;

  const breakStart = segment1End;
  const breakEnd = breakStart + pause;

  const segment2Start = breakEnd;
  const segment2End = segment2Start + after;

  return {
    before,
    pause,
    after,
    total,
    segment1Start,
    segment1End,
    breakStart,
    breakEnd,
    segment2Start,
    segment2End,
    totalEnd: segment2End,
  };
}

function getAppointmentBusySegments(appointment: BusyAppointment) {
  const start = parseTime(appointment.start_time);
  const end = parseTime(appointment.end_time);

  const hasBreak = appointment.break_start_time && appointment.break_end_time;

  if (!hasBreak) {
    return [
      {
        start,
        end,
      },
    ];
  }

  const breakStart = parseTime(appointment.break_start_time!);
  const breakEnd = parseTime(appointment.break_end_time!);

  return [
    {
      start,
      end: breakStart,
    },
    {
      start: breakEnd,
      end,
    },
  ];
}

export default function ReservationPage() {
  const [categoryFilter, setCategoryFilter] = useState("all");

  const [services, setServices] = useState<Service[]>([]);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [loadingServices, setLoadingServices] = useState(true);
  const [servicesError, setServicesError] = useState("");

  const [settings, setSettings] = useState<SalonSettings | null>(null);
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [staffSchedules, setStaffSchedules] = useState<StaffSchedule[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>("");

  const [selectedDateKey, setSelectedDateKey] = useState<string>("");
  const [selectedDateLabel, setSelectedDateLabel] = useState<string>("--");
  const [selectedTime, setSelectedTime] = useState<string>("--:--");
  const [busyAppointments, setBusyAppointments] = useState<BusyAppointment[]>(
    [],
  );
  const [exceptionClosures, setExceptionClosures] = useState<
    ExceptionClosure[]
  >([]);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [isKnownClient, setIsKnownClient] = useState(false);
  const [message, setMessage] = useState("");

  const [status, setStatus] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);

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
      const supabase = createClient();

      const { data: settingsData } = await supabase
        .from("salon_settings")
        .select("*")
        .limit(1)
        .maybeSingle();

      setSettings((settingsData ?? null) as SalonSettings | null);

      const { data, error } = await supabase
        .from("services")
        .select(
          `
          id,
          name,
          price_cents,
          duration_minutes,
          duration_before_break,
          break_duration,
          duration_after_break,
          categories (
            name
          )
        `,
        )
        .eq("is_visible", true)
        .order("display_order", { ascending: true });

      if (error) {
        setServicesError((error as Error).message);
        setLoadingServices(false);
        return;
      }

      const mapped: Service[] =
        data?.map((item: ServiceRow) => {
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

      const { data: staffData } = await supabase
        .from("staff")
        .select("id, first_name, last_name, color")
        .eq("is_active", true)
        .order("last_name", { ascending: true });

      const staffList = (staffData ?? []) as StaffRow[];
      setStaff(staffList);
      if (staffList.length === 1) setSelectedStaffId(staffList[0].id);

      const { data: schedulesData } = await supabase
        .from("staff_schedules")
        .select("*")
        .order("day_of_week", { ascending: true });

      setStaffSchedules((schedulesData ?? []) as StaffSchedule[]);
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    if (!selectedDateKey) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`slots-${selectedDateKey}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'appointments',
        },
        (payload: RealtimePayload) => {
          const date =
            payload?.new?.appointment_date ||
            payload?.old?.appointment_date;
          if (!date || date === selectedDateKey) {
            loadBusyAppointmentsForDay(selectedDateKey).catch(() => {});
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [selectedDateKey]);

  const openingMinutes = useMemo(
    () => parseTime(settings?.opening_time?.slice(0, 5) || "09:00"),
    [settings],
  );
  const closingMinutes = useMemo(
    () => parseTime(settings?.closing_time?.slice(0, 5) || "19:00"),
    [settings],
  );

  const filteredServices = useMemo(() => {
    return categoryFilter === "all"
      ? services
      : services.filter((service) => service.category === categoryFilter);
  }, [categoryFilter, services]);

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

  const loadBusyAppointmentsForDay = async (appointmentDate: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("appointments")
      .select(
        "id, start_time, end_time, break_start_time, break_end_time, status, staff_id",
      )
      .eq("appointment_date", appointmentDate)
      .in("status", ["confirmed", "completed"])
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error((error as Error).message);
    }

    const rows = (data ?? []) as BusyAppointment[];
    setBusyAppointments(rows);
    return rows;
  };

  const loadClosuresForDay = async (appointmentDate: string) => {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("exception_closures")
      .select("id, closure_date, start_time, end_time, is_all_day, reason")
      .eq("closure_date", appointmentDate)
      .order("start_time", { ascending: true });

    if (error) {
      throw new Error((error as Error).message);
    }

    const rows = (data ?? []) as ExceptionClosure[];
    setExceptionClosures(rows);
    return rows;
  };

  const isBlockedByExceptionalClosure = (
    slotStart: number,
    slotEnd: number,
    closures: ExceptionClosure[],
  ) => {
    return closures.some((closure) => {
      if (closure.is_all_day) return true;
      if (!closure.start_time || !closure.end_time) return false;

      const closureStart = parseTime(closure.start_time);
      const closureEnd = parseTime(closure.end_time);

      return overlaps(slotStart, slotEnd, closureStart, closureEnd);
    });
  };

  const isSlotAvailable = (
    slotStart: number,
    service: Service | null,
    appointments: BusyAppointment[],
    closures: ExceptionClosure[],
    staffClosingMinutes?: number,
    staffSchedule?: StaffSchedule | null,
  ) => {
    const segments = getServiceSegments(service, slotStart);
    const effectiveClosing = staffClosingMinutes ?? closingMinutes;

    if (segments.totalEnd > effectiveClosing) return false;

    // Bloquer si créneau pendant la pause de la coiffeuse
    if (staffSchedule?.has_break && staffSchedule.break_start && staffSchedule.break_end) {
      const bStart = parseTime(staffSchedule.break_start.slice(0, 5));
      const bEnd = parseTime(staffSchedule.break_end.slice(0, 5));
      if (segments.segment1Start < bEnd && segments.totalEnd > bStart) return false;
    }

    // Filtrer les RDV selon la coiffeuse sélectionnée
    const relevantAppointments = selectedStaffId
      ? appointments.filter((a) => a.staff_id === selectedStaffId || a.staff_id === null)
      : appointments;

    const blockedByAppointments = relevantAppointments.some((appointment) => {
      const busySegments = getAppointmentBusySegments(appointment);
      return busySegments.some((busySegment) => {
        const overlapSegment1 = overlaps(segments.segment1Start, segments.segment1End, busySegment.start, busySegment.end);
        const overlapSegment2 = segments.after > 0 && overlaps(segments.segment2Start, segments.segment2End, busySegment.start, busySegment.end);
        return overlapSegment1 || overlapSegment2;
      });
    });

    const blockedByClosures =
      isBlockedByExceptionalClosure(segments.segment1Start, segments.segment1End, closures) ||
      (segments.after > 0 && isBlockedByExceptionalClosure(segments.segment2Start, segments.segment2End, closures));

    return !blockedByAppointments && !blockedByClosures;
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

  // Schedule de la coiffeuse sélectionnée pour la date choisie
  const selectedStaffSchedule = useMemo(() => {
    if (!selectedStaffId || !selectedDateKey) return null;
    return getStaffScheduleForDate(selectedStaffId, selectedDateKey);
  }, [selectedStaffId, selectedDateKey, staffSchedules]);

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

      return {
        ...slot,
        available: !isPast && isSlotAvailable(
          slotStart,
          selectedService,
          busyAppointments,
          exceptionClosures,
          effectiveClosingMinutes,
          selectedStaffSchedule,
        ),
      };
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
  ]);

  const handleSelectDate = async (date: Date) => {
    const key = toKey(date);
    setSelectedDateKey(key);
    setSelectedDateLabel(formatDateLabel(date));
    scrollToSection(slotSectionRef);

    try {
      const [rows, closures] = await Promise.all([
        loadBusyAppointmentsForDay(key),
        loadClosuresForDay(key),
      ]);

      const duration = selectedService?.duration ?? 30;
      const allSlots = getAllSlots(duration, effectiveOpeningMinutes, effectiveClosingMinutes);

      const now = new Date();
      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      const isToday = key === todayKey;

      const firstAvailable = allSlots.find((slot) => {
        const slotStart = parseTime(slot.label);
        if (isToday && slotStart <= currentMinutes) return false;
        return isSlotAvailable(slotStart, selectedService, rows, closures, effectiveClosingMinutes, getStaffScheduleForDate(selectedStaffId, key));
      });

      setSelectedTime(firstAvailable ? firstAvailable.label : "--:--");
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

    const supabase = createClient();

    const { data, error } = await supabase
      .from("clients")
      .select("id, first_name, last_name, email")
      .eq("phone", normalizedPhone)
      .maybeSingle<ExistingClientRow>();

    if (error) {
      setIsKnownClient(false);
      return;
    }

    if (data) {
      setFirstName(data.first_name ?? "");
      setLastName(data.last_name ?? "");
      setEmail(data.email ?? "");
      setIsKnownClient(true);
      return;
    }

    setIsKnownClient(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const supabase = createClient();
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

    try {
      setSaving(true);
      setStatus("");

      const normalizedPhone = digitsOnly;
      const appointmentDate = selectedDateKey;
      const startMinutes = parseTime(selectedTime);
      const segments = getServiceSegments(selectedService, startMinutes);

      const [rows, closures] = await Promise.all([
        loadBusyAppointmentsForDay(appointmentDate),
        loadClosuresForDay(appointmentDate),
      ]);

      const stillAvailable = isSlotAvailable(
        startMinutes,
        selectedService,
        rows,
        closures,
        effectiveClosingMinutes,
        getStaffScheduleForDate(selectedStaffId, appointmentDate),
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

      let clientId: string | null = null;

      const { data: existingClient, error: existingClientError } =
        await supabase
          .from("clients")
          .select("id")
          .eq("phone", normalizedPhone)
          .maybeSingle<ClientRow>();

      if (existingClientError) {
        throw new Error(existingClientError.message);
      }

      if (existingClient?.id) {
        clientId = existingClient.id;

        const { error: updateClientError } = await supabase
          .from("clients")
          .update({
            first_name: firstName,
            last_name: lastName,
            email: email || null,
            notes: message || null,
          })
          .eq("id", clientId);

        if (updateClientError) {
          throw new Error(updateClientError.message);
        }
      } else {
        const { data: insertedClient, error: insertClientError } =
          await supabase
            .from("clients")
            .insert({
              first_name: firstName,
              last_name: lastName,
              phone: normalizedPhone,
              email: email || null,
              notes: message || null,
            })
            .select("id")
            .single<ClientRow>();

        if (insertClientError) {
          throw new Error(insertClientError.message);
        }

        clientId = insertedClient.id;
      }

      // Vérification anti-doublon : bloquer si un RDV confirmed existe déjà pour ce client à cette date/heure
      if (clientId) {
        const { data: existingAppointment } = await supabase
          .from("appointments")
          .select("id")
          .eq("client_id", clientId)
          .eq("appointment_date", appointmentDate)
          .eq("start_time", startTime)
          .eq("status", "confirmed")
          .maybeSingle();

        if (existingAppointment) {
          setStatus("Vous avez déjà un rendez-vous confirmé à ce créneau.");
          setSaving(false);
          return;
        }
      }

      // Assignation automatique si "Pas de préférence" et plusieurs coiffeuses
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
          return isSlotAvailable(startMinutes, selectedService, memberRows, closures, memberCloseMin, sched);
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

      const { error: appointmentError } = await supabase
        .from("appointments")
        .insert({
          client_id: clientId,
          service_id: selectedService.id,
          appointment_date: appointmentDate,
          start_time: startTime,
          end_time: endTime,
          break_start_time: breakStartTime,
          break_end_time: breakEndTime,
          status: "confirmed",
          source: "web",
          client_message: message || null,
          price_cents: selectedService.priceCents,
          staff_id: assignedStaffId,
        });

      if (appointmentError) {
        throw new Error(appointmentError.message);
      }

      setStatus("Rendez-vous confirmé ✅");
      setShowConfirmation(true);
      await Promise.all([
        loadBusyAppointmentsForDay(appointmentDate),
        loadClosuresForDay(appointmentDate),
      ]);
    } catch (error: unknown) {
      setStatus(
        `Erreur : ${(error as Error).message ?? "Impossible d'enregistrer le rendez-vous."}`,
      );
      setShowConfirmation(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,#fff7e8_0,#f8efe1_34%,#f3e6d4_62%,#fffaf4_100%)] text-[#1f1b17]">
      <div className="pointer-events-none fixed -left-24 top-20 h-72 w-72 rounded-full bg-[#d4af37]/20 blur-3xl" />
      <div className="pointer-events-none fixed -right-28 top-72 h-80 w-80 rounded-full bg-[var(--gold)]/10 blur-3xl" />
      <header className="sticky top-0 z-40 border-b border-[#e8d9c4]/60 bg-[#F2E8D9] shadow-[0_12px_30px_rgba(90,63,30,0.06)]">
        <div className="mx-auto flex w-[min(1200px,calc(100%-28px))] items-center justify-between gap-4 py-3">
          <Link href="/" className="group flex items-center gap-3">
            <div className="h-14 w-14 shrink-0 flex items-center justify-center overflow-hidden rounded-[22px] border border-[#eadfce] bg-[#f4eadc] shadow-[0_12px_26px_rgba(185,139,61,0.18)]">
              <img src="/icon-192.png" alt={BRAND_NAME} className="h-full w-full object-cover" />
            </div>
            <span>
              <span className="block text-2xl leading-none tracking-tight sm:text-3xl">
                Boucle d<span className="text-[var(--gold)]">’Or</span>
              </span>
              <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.28em] text-[#8a7863]">
                Réservation en ligne
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              className="rounded-full border border-[#d8c8b3]/70 bg-white/50 px-4 py-2 text-sm font-semibold text-[#4a3a2c] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_24px_rgba(80,56,32,0.08)]"
            >
              Accueil
            </Link>
            <Link
              href="/espace-client"
              className="hidden rounded-full border border-[#d8c8b3]/70 bg-white/50 px-4 py-2 text-sm font-semibold text-[#4a3a2c] transition hover:-translate-y-0.5 hover:bg-white hover:shadow-[0_10px_24px_rgba(80,56,32,0.08)] sm:inline-flex"
            >
              Espace client
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto grid w-[min(1200px,calc(100%-28px))] gap-6 py-8 sm:py-10 lg:grid-cols-[0.78fr_1.22fr]">
        <aside className="grid gap-5">
          <div className="rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
              Étapes
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Comment réserver
            </h2>

            <div className="mt-5 grid gap-3">
              {[
                [
                  "1",
                  "Choisissez une prestation",
                  "La durée influence les disponibilités.",
                ],
                ["2", "Choisissez une date", ""],
                [
                  "3",
                  "Choisissez un créneau",
                  "Les créneaux déjà pris ou fermés sont grisés.",
                ],
              ].map(([n, title, text]) => (
                <div
                  key={n}
                  className="grid grid-cols-[40px_1fr] gap-4 rounded-[20px] border border-white/70 bg-white/70 p-4 shadow-sm"
                >
                  <div className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-[#22180f] to-[#7b5a2e] font-bold text-white shadow-[0_8px_18px_rgba(60,40,20,0.18)]">
                    {n}
                  </div>
                  <div>
                    <strong>{title}</strong>
                    {text ? (
                      <p className="mt-1 text-sm text-[#6e655c]">{text}</p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="hidden lg:block rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
              Résumé
            </div>
            <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
              Votre sélection
            </h2>

            <div className="mt-5 grid gap-3">
              <div className="flex justify-between gap-4 border-b border-[#e7ddd0] pb-3 text-[#6e655c]">
                <strong className="text-[#1f1b17]">Catégorie</strong>
                <span>
                  {selectedService ? selectedService.category : "Chargement..."}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#e7ddd0] pb-3 text-[#6e655c]">
                <strong className="text-[#1f1b17]">Prestation</strong>
                <span>
                  {selectedService ? selectedService.name : "Chargement..."}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#e7ddd0] pb-3 text-[#6e655c]">
                <strong className="text-[#1f1b17]">Durée</strong>
                <span>
                  {selectedService ? `${selectedService.duration} min` : "--"}
                </span>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#e7ddd0] pb-3 text-[#6e655c]">
                <strong className="text-[#1f1b17]">Date</strong>
                <span>{selectedDateLabel}</span>
              </div>
              <div className="flex justify-between gap-4 border-b border-[#e7ddd0] pb-3 text-[#6e655c]">
                <strong className="text-[#1f1b17]">Heure</strong>
                <span>{selectedTime}</span>
              </div>
              <div className="flex justify-between gap-4 text-[#6e655c]">
                <strong className="text-[#1f1b17]">Total</strong>
                <span className="font-semibold text-[var(--gold)]">
                  {selectedService ? selectedService.price : "--"}
                </span>
              </div>
            </div>
          </div>
        </aside>

        <div className="grid gap-5">
          <section className="rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                  1 • Prestations
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choisissez votre service
                </h2>
              </div>
              <p className="text-sm text-[#6e655c]">
                Filtre par catégorie puis sélection.
              </p>
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="mb-4 min-w-[220px] rounded-2xl border border-[#e2d3bf] bg-white/80 px-4 py-3 text-[#2b2116] shadow-sm outline-none transition focus:border-[var(--gold)] focus:ring-4 focus:ring-[#d4af37]/15"
            >
              <option value="all">Toutes les catégories</option>
              {[...new Set(services.map((s) => s.category))].map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>

            {loadingServices ? (
              <p className="text-[#6e655c]">Chargement des prestations...</p>
            ) : servicesError ? (
              <p className="text-red-600">Erreur : {servicesError}</p>
            ) : filteredServices.length === 0 ? (
              <p className="text-[#6e655c]">Aucune prestation visible.</p>
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
                        scrollToSection(staff.length > 0 ? staffSectionRef : dateSectionRef);
                        if (selectedDateKey) {
                          Promise.all([
                            loadBusyAppointmentsForDay(selectedDateKey),
                            loadClosuresForDay(selectedDateKey),
                          ]).catch(() => {});
                        }
                      }}
                      className={`rounded-[24px] border p-5 text-left shadow-sm transition-all duration-200 ease-out active:scale-[0.95] ${
                        active
                          ? "scale-[1.015] border-[#2b2116] bg-[#2b2116] text-white shadow-[0_18px_42px_rgba(43,33,22,0.28)] ring-2 ring-[#d4af37]/35"
                          : "border-[#e7ddd0] bg-white/86 text-[#2b2116] hover:-translate-y-1 hover:scale-[1.015] hover:border-[#d8b56d] hover:shadow-[0_16px_34px_rgba(90,63,30,0.10)]"
                      }`}
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <h3 className="text-xl">{service.name}</h3>
                          {active ? (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#d4af37] text-sm font-bold text-[#2b2116] shadow-sm">
                              ✓
                            </span>
                          ) : null}
                        </div>
                        <span
                          className={`whitespace-nowrap font-semibold ${
                            active ? "text-[#f7d37a]" : "text-[var(--gold)]"
                          }`}
                        >
                          {service.price}
                        </span>
                      </div>
                      <div
                        className={`text-sm ${
                          active ? "text-white/75" : "text-[#6e655c]"
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

          {staff.length > 0 && (
            <section ref={staffSectionRef} className="scroll-mt-28 rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
              <div className="mb-5">
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                  2 • Coiffeuse
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choisissez votre coiffeuse
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
                      ? "border-[var(--gold)] bg-[#fff8e8] shadow-[0_16px_34px_rgba(185,139,61,0.16)]"
                      : "border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d]"
                  }`}
                >
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-2xl border border-[#eadfce] bg-gradient-to-br from-[#f4eadc] to-[#e8d5b8] text-lg">
                    ✨
                  </div>
                  <div className="font-semibold">Pas de préférence</div>
                  <div className="mt-1 text-xs text-[#6e655c]">La première disponible</div>
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
                        ? "border-[var(--gold)] bg-[#fff8e8] shadow-[0_16px_34px_rgba(185,139,61,0.16)]"
                        : "border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d]"
                    }`}
                  >
                    <div
                      className="mb-2 h-10 w-10 rounded-2xl border border-[#eadfce]"
                      style={{ backgroundColor: member.color }}
                    />
                    <div className="font-semibold">{member.first_name} {member.last_name}</div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section ref={dateSectionRef} className="scroll-mt-28 rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                  {staff.length > 0 ? "3 • Date" : "2 • Date"}
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
                    ? "border-[#e7ddd0] bg-white/80 text-[#2b2116] hover:border-[#d8b56d] hover:shadow-md active:scale-95"
                    : "cursor-not-allowed border-[#e7ddd0] bg-white/40 text-[#b1a799]"
                }`}
                aria-label="Mois précédent"
              >
                ‹
              </button>

              <span className="text-base font-semibold capitalize text-[#1f1b17]">
                {monthNames[calendarMonth]} {calendarYear}
              </span>

              <button
                type="button"
                onClick={handleNextMonth}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e7ddd0] bg-white/80 text-[#2b2116] transition duration-200 hover:border-[#d8b56d] hover:shadow-md active:scale-95"
                aria-label="Mois suivant"
              >
                ›
              </button>
            </div>

            <div className="mb-3 grid grid-cols-7 gap-2 sm:gap-3">
              {dayNames.map((name) => (
                <div
                  key={name}
                  className="text-center text-xs font-bold uppercase tracking-[0.12em] text-[#6e655c]"
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
                        className="aspect-square min-h-[40px] rounded-2xl bg-white/40 opacity-50 sm:min-h-[56px]"
                      />
                    ))}

                    {calendarDays.map((date) => {
                      const key = toKey(date);
                      const isPast = key < todayKey;
                      const closed = !isOpenDayFromSettings(date, settings);
                      const staffClosed = selectedStaffMember ? (() => {
                        const sched = getStaffScheduleForDate(selectedStaffMember.id, key);
                        return sched ? !sched.is_open : false;
                      })() : false;
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
                              ? "cursor-not-allowed border-[#e7ddd0] bg-[#eee7dc]/80 text-[#b1a799]"
                              : active
                                ? "border-[var(--gold)] bg-[#fff8e8] shadow-[0_16px_34px_rgba(185,139,61,0.16),inset_0_0_0_1px_var(--gold)]"
                                : "border-[#e7ddd0] bg-white/86 hover:-translate-y-1 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.10)]"
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

          <section ref={slotSectionRef} className="scroll-mt-28 rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                  {staff.length > 0 ? "4 • Créneau" : "3 • Créneau"}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Choisissez votre moment
                </h2>
              </div>
              <p className="text-sm text-[#6e655c]">
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
                      ? "border-[var(--gold)] bg-[#fff8e8] shadow-[0_16px_34px_rgba(185,139,61,0.16),inset_0_0_0_1px_var(--gold)]"
                      : "border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)]"
                  } ${!selectedDateKey || !slot.available ? "cursor-not-allowed opacity-40" : ""}`}
                >
                  {slot.label}
                </button>
              ))}
            </div>
          </section>

          <section ref={contactSectionRef} className="scroll-mt-28 rounded-[30px] border border-white/60 bg-white/62 p-5 shadow-[0_18px_45px_rgba(90,63,30,0.08)] backdrop-blur-xl sm:p-6">
            <div className="mb-4 flex items-end justify-between gap-4">
              <div>
                <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
                  {staff.length > 0 ? "5 • Coordonnées" : "4 • Coordonnées"}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                  Confirmez votre rendez-vous
                </h2>
              </div>
              <p className="text-sm text-[#6e655c]">
                Téléphone obligatoire, e-mail facultatif.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-[#6e655c]">
                  Prénom
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="rounded-[16px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[#1f1b17] outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm text-[#6e655c]">
                  Nom
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="rounded-[16px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[#1f1b17] outline-none"
                  />
                </label>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm text-[#6e655c]">
                  Téléphone
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => void handlePhoneChange(e.target.value)}
                    required
                    placeholder="06 00 00 00 00"
                    className="rounded-[16px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[#1f1b17] outline-none"
                  />
                  {phone.length === 10 ? (
                    <span
                      className={`text-xs ${isKnownClient ? "text-[#1f6a3a]" : "text-[#6e655c]"}`}
                    >
                      {isKnownClient
                        ? "Client reconnu, les informations ont été préremplies."
                        : "Nouveau client, les informations seront enregistrées à la confirmation."}
                    </span>
                  ) : null}
                </label>

                <label className="grid gap-2 text-sm text-[#6e655c]">
                  E-mail (facultatif)
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votreadresse@email.com"
                    className="rounded-[16px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[#1f1b17] outline-none"
                  />
                </label>
              </div>

              <label className="grid gap-2 text-sm text-[#6e655c]">
                Message au salon
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Une précision sur votre rendez-vous..."
                  className="min-h-[110px] rounded-[16px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] px-4 py-3 text-[#1f1b17] outline-none"
                />
              </label>

              <div className="mt-2 flex flex-col gap-4 rounded-[24px] border border-[#ead7b7] bg-gradient-to-br from-[#fffaf0] to-[#fff5df] p-5 shadow-[0_16px_36px_rgba(185,139,61,0.10)] md:flex-row md:items-center md:justify-between">
                <div>
                  <strong>Rendez-vous prêt à être confirmé</strong>
                  <p className="mt-1 text-sm text-[#6e655c]">
                    {selectedService ? selectedService.category : "—"} •{" "}
                    {selectedService ? selectedService.name : "—"} •{" "}
                    {selectedDateLabel} • {selectedTime} •{" "}
                    {selectedService ? selectedService.price : "—"}
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="rounded-full bg-gradient-to-r from-[#14110d] to-[#5d4020] px-6 py-4 font-semibold text-white shadow-[0_14px_30px_rgba(30,20,10,0.18)] transition hover:-translate-y-0.5 hover:shadow-[0_18px_38px_rgba(30,20,10,0.22)] disabled:opacity-50"
                >
                  {saving ? "Enregistrement..." : "Confirmer le rendez-vous"}
                </button>
              </div>

              {status ? (
                <div className="rounded-[16px] border border-[#c7e0ce] bg-[#f5fbf6] px-4 py-3 text-sm text-[#1f6a3a]">
                  {status}
                </div>
              ) : null}
            </form>
          </section>
        </div>
      </section>

      {showConfirmation && selectedService ? (
        <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/45 p-5 backdrop-blur-md sm:items-center">
          <div className="my-auto w-full max-w-3xl rounded-[32px] border border-white/60 bg-[#fffaf4]/95 p-6 shadow-[0_24px_70px_rgba(0,0,0,0.16)] backdrop-blur-xl sm:p-8">
            <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
              Rendez-vous confirmé
            </div>
            <h2 className="text-4xl">
              Merci, votre réservation est validée ✅
            </h2>
            <p className="mt-3 text-[#6e655c]">
              Votre rendez-vous a bien été enregistré. Voici votre
              récapitulatif.
            </p>

            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Cliente / client</strong>
                <span className="mt-2 block text-sm text-[#6e655c]">
                  {firstName} {lastName}
                </span>
              </div>
              <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Téléphone</strong>
                <span className="mt-2 block text-sm text-[#6e655c]">
                  {phone}
                </span>
              </div>
              <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Prestation</strong>
                <span className="mt-2 block text-sm text-[#6e655c]">
                  {selectedService.name}
                </span>
              </div>
              <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Date et heure</strong>
                <span className="mt-2 block text-sm text-[#6e655c]">
                  {selectedDateLabel} à {selectedTime}
                </span>
              </div>
              <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Tarif</strong>
                <span className="mt-2 block text-sm text-[#6e655c]">
                  {selectedService.price}
                </span>
              </div>
              {selectedStaffId && staff.find((m) => m.id === selectedStaffId) ? (
                <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                  <strong>Coiffeuse</strong>
                  <span className="mt-2 block text-sm text-[#6e655c]">
                    {(() => { const m = staff.find((s) => s.id === selectedStaffId); return m ? `${m.first_name} ${m.last_name}` : ""; })()}
                  </span>
                </div>
              ) : null}
              <div className="rounded-[18px] border border-[#e7ddd0] bg-white/86 hover:border-[#d8b56d] hover:shadow-[0_12px_26px_rgba(90,63,30,0.08)] p-4">
                <strong>Salon</strong>
                <span className="mt-2 block text-sm text-[#6e655c]">
                  {settings?.salon_name || "Boucle d’Or"}
                </span>
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <a
                href="/espace-client"
                className="rounded-full border border-[#d8c8b3] bg-white/60 px-5 py-3 font-semibold transition hover:bg-white hover:shadow-md"
              >
                Gérer mon rendez-vous
              </a>
              <a
                href="/"
                className="rounded-full bg-gradient-to-r from-[#14110d] to-[#5d4020] px-5 py-3 font-semibold text-white shadow-md transition hover:-translate-y-0.5"
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
