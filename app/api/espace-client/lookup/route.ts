import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Recherche des rendez-vous à venir d'un client par téléphone, scopée au
// salon résolu côté serveur (le numéro de téléphone fait office
// d'identifiant — modèle existant, on ne change que la portée par salon).
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/\D/g, "");

  if (phone.length !== 10) {
    return NextResponse.json({ error: "Le numéro de téléphone doit contenir exactement 10 chiffres." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  const { data: clientRows, error: clientError } = await supabase
    .from("clients")
    .select("id, first_name, last_name, phone, email")
    .eq("salon_id", salon.id)
    .eq("phone", phone);

  if (clientError) {
    return NextResponse.json({ error: clientError.message }, { status: 500 });
  }

  if (!clientRows || clientRows.length === 0) {
    return NextResponse.json({ appointments: [] });
  }

  const clientIds = clientRows.map((c) => c.id);

  const { data: appointments, error: appointmentError } = await supabase
    .from("appointments")
    .select(
      `
      id,
      appointment_date,
      start_time,
      end_time,
      status,
      source,
      price_cents,
      client_message,
      staff_id,
      staff ( first_name, last_name ),
      services ( id, name, duration_minutes, categories ( name ) ),
      clients ( id, first_name, last_name, phone, email )
    `
    )
    .eq("salon_id", salon.id)
    .in("client_id", clientIds)
    .in("status", ["confirmed", "completed"])
    .gte("appointment_date", new Date().toISOString().slice(0, 10))
    .order("appointment_date", { ascending: true })
    .order("start_time", { ascending: true });

  if (appointmentError) {
    return NextResponse.json({ error: appointmentError.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: appointments ?? [] });
}
