import type { SupabaseClient } from "@supabase/supabase-js";
import {
  getExceptionalOpening,
  isOpenDayFromSettings,
  isSlotAvailable,
  minBookableDateKey,
  parseTime,
  type BookingMinNotice,
  type BusyAppointment,
  type DayFlagsSettings,
  type ExceptionClosure,
  type ExceptionOpening,
  type ServiceDurations,
  type StaffSchedule,
} from "@/lib/availability";

const DAY_SLUGS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"] as const;

const HOURS_COLUMNS = [
  "is_open_monday", "is_open_tuesday", "is_open_wednesday", "is_open_thursday", "is_open_friday", "is_open_saturday", "is_open_sunday",
  "opening_time", "closing_time",
  "opening_time_monday", "closing_time_monday", "opening_time_tuesday", "closing_time_tuesday",
  "opening_time_wednesday", "closing_time_wednesday", "opening_time_thursday", "closing_time_thursday",
  "opening_time_friday", "closing_time_friday", "opening_time_saturday", "closing_time_saturday",
  "opening_time_sunday", "closing_time_sunday",
  "booking_min_notice",
].join(", ");

type HoursSettings = DayFlagsSettings & {
  opening_time: string | null;
  closing_time: string | null;
  booking_min_notice: BookingMinNotice | null;
} & Record<`opening_time_${typeof DAY_SLUGS[number]}`, string | null> & Record<`closing_time_${typeof DAY_SLUGS[number]}`, string | null>;

export type SlotValidationResult = { ok: true } | { ok: false; message: string };

// Revalide côté serveur, à l'écriture, exactement les mêmes règles que celles
// déjà affichées au client (ReservationClient.tsx) : jour ouvert, horaires
// (salon + prestataire), pause prestataire, chevauchement avec d'autres
// rendez-vous, fermetures exceptionnelles. Ne jamais faire confiance à la
// disponibilité calculée côté navigateur — elle peut être périmée (un autre
// client a réservé entre-temps) ou falsifiée.
export async function validateAppointmentSlot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  salonId: string,
  params: {
    appointmentDate: string;
    startMinutes: number;
    durations: ServiceDurations;
    staffId: string | null;
    excludeAppointmentId?: string;
  },
): Promise<SlotValidationResult> {
  const { appointmentDate, startMinutes, durations, staffId, excludeAppointmentId } = params;
  const date = new Date(`${appointmentDate}T12:00:00`);
  const dayOfWeek = date.getDay();

  const { data: settings } = await supabase
    .from("salon_settings")
    .select(HOURS_COLUMNS)
    .eq("salon_id", salonId)
    .maybeSingle<HoursSettings>();

  const dayNormallyOpen = !!settings && isOpenDayFromSettings(date, settings);

  const todayKey = new Date().toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
  if (appointmentDate < minBookableDateKey(todayKey, settings?.booking_min_notice)) {
    return { ok: false, message: "Ce créneau ne respecte pas le délai minimum de réservation en ligne." };
  }

  const [{ data: appointmentsData }, { data: closuresData }, { data: openingsData }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, start_time, end_time, break_start_time, break_end_time, status, staff_id")
      .eq("salon_id", salonId)
      .eq("appointment_date", appointmentDate)
      .in("status", ["confirmed", "completed"]),
    supabase
      .from("exception_closures")
      .select("id, closure_date, start_time, end_time, is_all_day, reason, staff_id")
      .eq("salon_id", salonId)
      .eq("closure_date", appointmentDate),
    supabase
      .from("exception_openings")
      .select("id, opening_date, opening_time, closing_time, reason, staff_id")
      .eq("salon_id", salonId)
      .eq("opening_date", appointmentDate),
  ]);

  const allOpenings = (openingsData ?? []) as ExceptionOpening[];
  const exceptionalOpening = getExceptionalOpening(appointmentDate, allOpenings, staffId);

  if (!settings || (!dayNormallyOpen && !exceptionalOpening)) {
    return { ok: false, message: "Le salon est fermé ce jour-là." };
  }

  const slug = DAY_SLUGS[dayOfWeek];
  const salonOpening = exceptionalOpening
    ? parseTime(exceptionalOpening.opening_time.slice(0, 5))
    : parseTime((settings[`opening_time_${slug}`] ?? settings.opening_time ?? "09:00").slice(0, 5));
  const salonClosing = exceptionalOpening
    ? parseTime(exceptionalOpening.closing_time.slice(0, 5))
    : parseTime((settings[`closing_time_${slug}`] ?? settings.closing_time ?? "19:00").slice(0, 5));

  let staffSchedule: StaffSchedule | null = null;
  let effectiveClosing = salonClosing;
  let effectiveOpening = salonOpening;

  if (staffId) {
    const { data: schedule } = await supabase
      .from("staff_schedules")
      .select("*")
      .eq("salon_id", salonId)
      .eq("staff_id", staffId)
      .eq("day_of_week", dayOfWeek)
      .maybeSingle<StaffSchedule>();

    if (exceptionalOpening) {
      // Ouverture exceptionnelle : le planning jour-de-semaine du staff ne bloque pas.
      // Si la prestataire a quand même un planning actif ce jour, on l'intersecte ;
      // sinon on utilise directement les horaires de l'ouverture exceptionnelle.
      if (schedule && schedule.is_open) {
        staffSchedule = schedule;
        effectiveOpening = Math.max(salonOpening, parseTime(schedule.opening_time.slice(0, 5)));
        effectiveClosing = Math.min(salonClosing, parseTime(schedule.closing_time.slice(0, 5)));
      }
    } else {
      if (!schedule || !schedule.is_open) {
        return { ok: false, message: "Cette prestataire ne travaille pas ce jour-là." };
      }
      staffSchedule = schedule;
      effectiveOpening = Math.max(salonOpening, parseTime(schedule.opening_time.slice(0, 5)));
      effectiveClosing = Math.min(salonClosing, parseTime(schedule.closing_time.slice(0, 5)));
    }
  }

  if (startMinutes < effectiveOpening) {
    return { ok: false, message: "Ce créneau est hors des horaires d'ouverture." };
  }

  const appointments = ((appointmentsData ?? []) as BusyAppointment[]).filter(
    (a) => a.id !== excludeAppointmentId,
  );
  // Closures applicables : salon entier (staff_id null) + spécifiques à cette prestataire
  const allClosures = (closuresData ?? []) as ExceptionClosure[];
  const closures = staffId
    ? allClosures.filter((c) => !c.staff_id || c.staff_id === staffId)
    : allClosures.filter((c) => !c.staff_id);

  const available = isSlotAvailable(
    startMinutes,
    durations,
    appointments,
    closures,
    effectiveClosing,
    staffSchedule,
    staffId,
  );

  return available ? { ok: true } : { ok: false, message: "Ce créneau n'est plus disponible." };
}
