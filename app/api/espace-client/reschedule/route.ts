import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/\D/g, "");
  const appointmentId = String(body?.appointmentId ?? "");
  const appointmentDate = String(body?.appointmentDate ?? "");
  const startTime = String(body?.startTime ?? "");
  const endTime = String(body?.endTime ?? "");

  if (phone.length !== 10 || !appointmentId || !appointmentDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Informations manquantes." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, client_id, clients(phone)")
    .eq("id", appointmentId)
    .eq("salon_id", salon.id)
    .maybeSingle<{ id: string; client_id: string; clients: { phone: string } | null }>();

  if (!appointment || appointment.clients?.phone !== phone) {
    return NextResponse.json({ error: "Rendez-vous introuvable." }, { status: 404 });
  }

  const { error } = await supabase
    .from("appointments")
    .update({ appointment_date: appointmentDate, start_time: startTime, end_time: endTime })
    .eq("id", appointmentId)
    .eq("salon_id", salon.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
