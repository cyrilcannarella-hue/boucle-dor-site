import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { formatTime, getServiceSegments, parseTime, serviceDurationsFromRow } from "@/lib/availability";
import { validateAppointmentSlot } from "@/lib/availability-server";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/\D/g, "");
  const appointmentId = String(body?.appointmentId ?? "");
  const appointmentDate = String(body?.appointmentDate ?? "");
  const startTime = String(body?.startTime ?? "");

  if (
    phone.length !== 10 ||
    !appointmentId ||
    !/^\d{4}-\d{2}-\d{2}$/.test(appointmentDate) ||
    !/^\d{2}:\d{2}/.test(startTime)
  ) {
    return NextResponse.json({ error: "Informations manquantes." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, client_id, service_id, staff_id, clients(phone)")
    .eq("id", appointmentId)
    .eq("salon_id", salon.id)
    .maybeSingle<{
      id: string;
      client_id: string;
      service_id: string;
      staff_id: string | null;
      clients: { phone: string } | null;
    }>();

  if (!appointment || appointment.clients?.phone !== phone) {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }

  const { data: serviceRow, error: serviceError } = await supabase
    .from("services")
    .select("duration_minutes, duration_before_break, break_duration, duration_after_break")
    .eq("id", appointment.service_id)
    .eq("salon_id", salon.id)
    .maybeSingle();

  if (serviceError || !serviceRow) {
    return NextResponse.json({ error: "Prestation introuvable." }, { status: 404 });
  }

  // Recalculées côté serveur à partir de la prestation réelle, pour le
  // nouveau créneau — l'ancienne fenêtre de pause ne doit pas survivre au
  // déplacement.
  const durations = serviceDurationsFromRow(serviceRow);
  const startMinutes = parseTime(startTime);
  const segments = getServiceSegments(durations, startMinutes);

  const validation = await validateAppointmentSlot(supabase, salon.id, {
    appointmentDate,
    startMinutes,
    durations,
    staffId: appointment.staff_id,
    excludeAppointmentId: appointment.id,
  });

  if (!validation.ok) {
    return NextResponse.json({ error: validation.message }, { status: 409 });
  }

  const startTimePg = `${formatTime(startMinutes)}:00`;
  const endTimePg = `${formatTime(segments.totalEnd)}:00`;
  const breakStartTime = segments.pause > 0 ? `${formatTime(segments.breakStart)}:00` : null;
  const breakEndTime = segments.pause > 0 ? `${formatTime(segments.breakEnd)}:00` : null;

  const { error } = await supabase
    .from("appointments")
    .update({
      appointment_date: appointmentDate,
      start_time: startTimePg,
      end_time: endTimePg,
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
    })
    .eq("id", appointmentId)
    .eq("salon_id", salon.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
