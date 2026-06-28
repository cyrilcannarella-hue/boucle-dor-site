import { NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Données de référence de la page de réservation publique (catégories,
// prestations, équipe, plannings, questionnaire), scopées au salon résolu
// côté serveur. Remplace la lecture directe de ces tables depuis le
// navigateur (clé anon) : leurs policies RLS de lecture publique n'étaient
// pas filtrées par salon — n'importe qui pouvait lister ces données pour
// tous les salons de la plateforme via un appel direct à l'API Supabase.
export async function GET() {
  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();
  const today = new Date().toISOString().slice(0, 10);

  const [categoriesRes, servicesRes, staffRes, staffSchedulesRes, questionsRes, exceptionOpeningsRes] = await Promise.all([
    supabase
      .from("categories")
      .select("name, display_order")
      .eq("salon_id", salon.id)
      .order("display_order", { ascending: true })
      .order("name", { ascending: true }),
    supabase
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
        categories ( name )
      `,
      )
      .eq("salon_id", salon.id)
      .eq("is_visible", true)
      .order("display_order", { ascending: true }),
    supabase
      .from("staff")
      .select("id, first_name, last_name, color")
      .eq("salon_id", salon.id)
      .eq("is_active", true)
      .order("last_name", { ascending: true }),
    supabase
      .from("staff_schedules")
      .select("*")
      .eq("salon_id", salon.id)
      .order("day_of_week", { ascending: true }),
    supabase
      .from("questionnaire_questions")
      .select("id, question, display_order")
      .eq("salon_id", salon.id)
      .eq("is_active", true)
      .order("display_order", { ascending: true })
      .order("created_at", { ascending: true }),
    supabase
      .from("exception_openings")
      .select("id, opening_date, opening_time, closing_time, reason, staff_id")
      .eq("salon_id", salon.id)
      .gte("opening_date", today)
      .order("opening_date", { ascending: true }),
  ]);

  return NextResponse.json({
    categories: categoriesRes.data ?? [],
    services: servicesRes.data ?? [],
    staff: staffRes.data ?? [],
    staffSchedules: staffSchedulesRes.data ?? [],
    questions: questionsRes.data ?? [],
    exceptionOpenings: exceptionOpeningsRes.data ?? [],
  });
}
