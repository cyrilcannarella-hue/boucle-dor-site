import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Lecture des créneaux occupés pour une date donnée, scopée au salon résolu
// côté serveur (sous-domaine) — utilisée par la réservation publique et
// l'espace client. Ne renvoie aucune donnée identifiante (pas de client_id).
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Paramètre date invalide." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, break_start_time, break_end_time, status, staff_id")
    .eq("salon_id", salon.id)
    .eq("appointment_date", date)
    .in("status", ["confirmed", "completed"])
    .order("start_time", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: data ?? [] });
}
