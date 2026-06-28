import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Lecture des créneaux occupés et des fermetures exceptionnelles pour une
// date donnée, scopée au salon résolu côté serveur (sous-domaine) —
// utilisée par la réservation publique et l'espace client. Ne renvoie
// aucune donnée identifiante (pas de client_id).
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Paramètre date invalide." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  const [{ data: appointments, error: appointmentsError }, { data: closures, error: closuresError }] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, start_time, end_time, break_start_time, break_end_time, status, staff_id")
      .eq("salon_id", salon.id)
      .eq("appointment_date", date)
      .in("status", ["confirmed", "completed"])
      .order("start_time", { ascending: true }),
    supabase
      .from("exception_closures")
      .select("id, closure_date, start_time, end_time, is_all_day, reason, staff_id")
      .eq("salon_id", salon.id)
      .eq("closure_date", date)
      .order("start_time", { ascending: true }),
  ]);

  if (appointmentsError) {
    return NextResponse.json({ error: appointmentsError.message }, { status: 500 });
  }
  if (closuresError) {
    return NextResponse.json({ error: closuresError.message }, { status: 500 });
  }

  return NextResponse.json({ appointments: appointments ?? [], closures: closures ?? [] });
}
