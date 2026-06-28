import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Recherche des rendez-vous à venir d'un client par téléphone, scopée au
// salon résolu côté serveur (le numéro de téléphone fait office
// d'identifiant — modèle existant, on ne change que la portée par salon).

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX_ATTEMPTS = 8;
const rateLimitAttempts = new Map<string, { count: number; resetAt: number }>();

// En mémoire par instance de fonction : avec Fluid Compute (instances
// réutilisées), ça freine déjà bien un balayage automatique de numéros,
// même si ce n'est pas un compteur partagé entre toutes les instances.
function isRateLimited(key: string) {
  const now = Date.now();

  if (rateLimitAttempts.size > 5000) {
    for (const [storedKey, entry] of rateLimitAttempts) {
      if (now > entry.resetAt) rateLimitAttempts.delete(storedKey);
    }
  }

  const entry = rateLimitAttempts.get(key);

  if (!entry || now > entry.resetAt) {
    rateLimitAttempts.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX_ATTEMPTS;
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const phone = String(body?.phone ?? "").replace(/\D/g, "");

  if (phone.length !== 10) {
    return NextResponse.json({ error: "Le numéro de téléphone doit contenir exactement 10 chiffres." }, { status: 400 });
  }

  const salon = await getCurrentSalon();
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (isRateLimited(`${salon.id}:${ip}`)) {
    return NextResponse.json({ error: "Trop de tentatives. Réessayez dans quelques minutes." }, { status: 429 });
  }

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
      clients ( first_name, last_name, phone, email )
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
