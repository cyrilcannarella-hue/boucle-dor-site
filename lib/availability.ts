// Logique de disponibilité des créneaux — partagée entre l'UI de réservation
// (ReservationClient.tsx, pour l'affichage) et les routes serveur de
// réservation/déplacement (pour la revalidation avant écriture). Une seule
// source de vérité : la version serveur doit voir exactement les mêmes
// créneaux que celle déjà affichée au client.

export type ServiceDurations = {
  duration: number;
  durationBeforeBreak: number;
  breakDuration: number;
  durationAfterBreak: number;
};

export type ServiceRow = {
  duration_minutes: number;
  duration_before_break: number | null;
  break_duration: number | null;
  duration_after_break: number | null;
};

export type BusyAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  status: "confirmed" | "cancelled" | "completed";
  staff_id: string | null;
};

export type ExceptionClosure = {
  id: string;
  closure_date: string;
  start_time: string | null;
  end_time: string | null;
  is_all_day: boolean;
  reason: string | null;
  staff_id?: string | null;
};

export type ExceptionOpening = {
  id: string;
  opening_date: string;
  opening_time: string;
  closing_time: string;
  reason: string | null;
  staff_id?: string | null;
};

// Ouverture effective pour une date et un staff donné.
// Priorité : ouverture spécifique au staff → ouverture salon entier → null.
export function getExceptionalOpening(dateKey: string, openings: ExceptionOpening[], staffId?: string | null): ExceptionOpening | null {
  if (staffId) {
    const staffOpening = openings.find((o) => o.opening_date === dateKey && o.staff_id === staffId);
    if (staffOpening) return staffOpening;
  }
  return openings.find((o) => o.opening_date === dateKey && !o.staff_id) ?? null;
}

// Pour l'affichage du calendrier : y a-t-il une ouverture pour ce jour, pour n'importe qui ?
export function hasOpeningForDate(dateKey: string, openings: ExceptionOpening[]): boolean {
  return openings.some((o) => o.opening_date === dateKey);
}

export type StaffSchedule = {
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

export type DayFlagsSettings = {
  is_open_monday: boolean;
  is_open_tuesday: boolean;
  is_open_wednesday: boolean;
  is_open_thursday: boolean;
  is_open_friday: boolean;
  is_open_saturday: boolean;
  is_open_sunday: boolean;
};

export function parseTime(str: string): number {
  const clean = str.slice(0, 5);
  const [h, m] = clean.split(":").map(Number);
  return h * 60 + m;
}

export function formatTime(min: number): string {
  const h = String(Math.floor(min / 60)).padStart(2, "0");
  const m = String(min % 60).padStart(2, "0");
  return `${h}:${m}`;
}

export function overlaps(startA: number, endA: number, startB: number, endB: number): boolean {
  return startA < endB && endA > startB;
}

// Même mapping que celui appliqué côté client (ReservationClient.tsx) au
// chargement des prestations — à garder identique pour ne jamais diverger.
export function serviceDurationsFromRow(row: ServiceRow): ServiceDurations {
  const durationBeforeBreak = row.duration_before_break ?? row.duration_minutes ?? 0;
  const breakDuration = row.break_duration ?? 0;
  const durationAfterBreak = row.duration_after_break ?? 0;
  return {
    duration: durationBeforeBreak + breakDuration + durationAfterBreak,
    durationBeforeBreak,
    breakDuration,
    durationAfterBreak,
  };
}

export function getServiceDurations(service: ServiceDurations | null) {
  const pause = service?.breakDuration ?? 0;
  const after = service?.durationAfterBreak ?? 0;
  const before = service?.durationBeforeBreak ?? Math.max(0, (service?.duration ?? 0) - pause - after);
  const total = before + pause + after;

  return { before, pause, after, total };
}

export function getServiceSegments(service: ServiceDurations | null, slotStart: number) {
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

export function getAppointmentBusySegments(appointment: BusyAppointment) {
  const start = parseTime(appointment.start_time);
  const end = parseTime(appointment.end_time);

  const hasBreak = appointment.break_start_time && appointment.break_end_time;

  if (!hasBreak) {
    return [{ start, end }];
  }

  const breakStart = parseTime(appointment.break_start_time!);
  const breakEnd = parseTime(appointment.break_end_time!);

  return [
    { start, end: breakStart },
    { start: breakEnd, end },
  ];
}

export function isBlockedByExceptionalClosure(
  slotStart: number,
  slotEnd: number,
  closures: ExceptionClosure[],
): boolean {
  return closures.some((closure) => {
    if (closure.is_all_day) return true;
    if (!closure.start_time || !closure.end_time) return false;

    const closureStart = parseTime(closure.start_time);
    const closureEnd = parseTime(closure.end_time);

    return overlaps(slotStart, slotEnd, closureStart, closureEnd);
  });
}

export function isOpenDayFromSettings(date: Date, settings: DayFlagsSettings | null): boolean {
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

// staffIdFilter : passer l'id de la prestataire choisie pour ne considérer
// que ses rendez-vous (+ ceux sans prestataire assignée) ; null/undefined
// pour considérer tous les rendez-vous tels que fournis par l'appelant
// (utile quand le filtrage par prestataire a déjà été fait avant l'appel).
export function isSlotAvailable(
  slotStart: number,
  service: ServiceDurations | null,
  appointments: BusyAppointment[],
  closures: ExceptionClosure[],
  closingMinutes: number,
  staffSchedule?: StaffSchedule | null,
  staffIdFilter?: string | null,
): boolean {
  const segments = getServiceSegments(service, slotStart);

  if (segments.totalEnd > closingMinutes) return false;

  // Bloquer si créneau pendant la pause de la prestataire
  if (staffSchedule?.has_break && staffSchedule.break_start && staffSchedule.break_end) {
    const bStart = parseTime(staffSchedule.break_start.slice(0, 5));
    const bEnd = parseTime(staffSchedule.break_end.slice(0, 5));
    if (segments.segment1Start < bEnd && segments.totalEnd > bStart) return false;
  }

  const relevantAppointments = staffIdFilter
    ? appointments.filter((a) => a.staff_id === staffIdFilter || a.staff_id === null)
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
}
