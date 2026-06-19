import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

type AnswerInput = { questionId: string; questionText: string; answer: string };

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
  }

  const phone = String(body.phone ?? "").replace(/\D/g, "");
  const firstName = String(body.firstName ?? "").trim();
  const lastName = String(body.lastName ?? "").trim();
  const email = String(body.email ?? "").trim();
  const message = String(body.message ?? "").trim();
  const serviceId = String(body.serviceId ?? "");
  const priceCents = Number(body.priceCents ?? 0);
  const appointmentDate = String(body.appointmentDate ?? "");
  const startTime = String(body.startTime ?? "");
  const endTime = String(body.endTime ?? "");
  const breakStartTime = body.breakStartTime ? String(body.breakStartTime) : null;
  const breakEndTime = body.breakEndTime ? String(body.breakEndTime) : null;
  const staffId = body.staffId ? String(body.staffId) : null;
  const answers: AnswerInput[] = Array.isArray(body.answers) ? body.answers : [];

  if (phone.length !== 10 || !firstName || !lastName || !serviceId || !appointmentDate || !startTime || !endTime) {
    return NextResponse.json({ error: "Informations manquantes ou invalides." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  let clientId: string;

  const { data: existingClient, error: existingClientError } = await supabase
    .from("clients")
    .select("id")
    .eq("salon_id", salon.id)
    .eq("phone", phone)
    .maybeSingle();

  if (existingClientError) {
    return NextResponse.json({ error: existingClientError.message }, { status: 500 });
  }

  if (existingClient?.id) {
    clientId = existingClient.id;
    const { error: updateError } = await supabase
      .from("clients")
      .update({ first_name: firstName, last_name: lastName, email: email || null, notes: message || null })
      .eq("id", clientId)
      .eq("salon_id", salon.id);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }
  } else {
    const { data: insertedClient, error: insertError } = await supabase
      .from("clients")
      .insert({ salon_id: salon.id, first_name: firstName, last_name: lastName, phone, email: email || null, notes: message || null })
      .select("id")
      .single();

    if (insertError || !insertedClient) {
      return NextResponse.json({ error: insertError?.message ?? "Impossible de créer la fiche client." }, { status: 500 });
    }
    clientId = insertedClient.id;
  }

  const { data: duplicate } = await supabase
    .from("appointments")
    .select("id")
    .eq("salon_id", salon.id)
    .eq("client_id", clientId)
    .eq("appointment_date", appointmentDate)
    .eq("start_time", startTime)
    .eq("status", "confirmed")
    .maybeSingle();

  if (duplicate) {
    return NextResponse.json({ error: "Vous avez déjà un rendez-vous confirmé à ce créneau." }, { status: 409 });
  }

  const { data: appointment, error: appointmentError } = await supabase
    .from("appointments")
    .insert({
      salon_id: salon.id,
      client_id: clientId,
      service_id: serviceId,
      appointment_date: appointmentDate,
      start_time: startTime,
      end_time: endTime,
      break_start_time: breakStartTime,
      break_end_time: breakEndTime,
      status: "confirmed",
      source: "web",
      client_message: message || null,
      price_cents: priceCents,
      staff_id: staffId,
    })
    .select("id")
    .single();

  if (appointmentError || !appointment) {
    return NextResponse.json({ error: appointmentError?.message ?? "Impossible d'enregistrer le rendez-vous." }, { status: 500 });
  }

  if (answers.length > 0) {
    await supabase.from("appointment_answers").insert(
      answers.map((a) => ({
        salon_id: salon.id,
        appointment_id: appointment.id,
        question_id: a.questionId,
        question_text: a.questionText,
        answer: a.answer,
      }))
    );
  }

  return NextResponse.json({ appointmentId: appointment.id });
}
