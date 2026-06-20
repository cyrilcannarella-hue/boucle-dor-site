import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const SLOT_TIMES = ["09:00", "11:00", "13:00", "15:00", "17:00"];
const FILL_PROBABILITY = 0.65;
const PAST_DAYS = 7;
const FUTURE_DAYS = 21;

// Numéros des 14 clients fictifs créés pour le salon démo (voir le script de
// seed initial). Tout client démo dont le numéro n'est pas dans cette liste
// vient d'une vraie réservation testée sur le site public — on le supprime
// à chaque passage pour ne jamais le réinjecter dans l'agenda fictif.
const SEED_CLIENT_PHONES = [
  "0700000001", "0700000002", "0700000003", "0700000004", "0700000005",
  "0700000006", "0700000007", "0700000008", "0700000009", "0700000010",
  "0700000011", "0700000012", "0700000013", "0700000014",
];

function parisDateKey(date: Date): string {
  return date.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}

function addMinutes(hhmm: string, minutes: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + minutes;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}:00`;
}

// Régénère chaque jour les rendez-vous du salon démo (toujours relatifs à
// "aujourd'hui") pour que son agenda ne se vide pas une fois les dates
// d'origine dépassées — voir app/api/cron/reminders pour le même pattern.
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: salon } = await supabase.from("salons").select("id").eq("slug", "demo").maybeSingle();
  if (!salon) {
    return NextResponse.json({ error: "Salon démo introuvable" }, { status: 404 });
  }

  await supabase.from("appointment_answers").delete().eq("salon_id", salon.id);
  await supabase.from("appointments").delete().eq("salon_id", salon.id);

  // Nettoie les clients créés par de vraies réservations testées sur le
  // site public (tout ce qui n'est pas un des 14 numéros de seed).
  await supabase
    .from("clients")
    .delete()
    .eq("salon_id", salon.id)
    .not("phone", "in", `(${SEED_CLIENT_PHONES.join(",")})`);

  const [{ data: clients }, { data: services }, { data: staff }] = await Promise.all([
    supabase.from("clients").select("id").eq("salon_id", salon.id),
    supabase.from("services").select("id, price_cents, duration_minutes").eq("salon_id", salon.id),
    supabase.from("staff").select("id").eq("salon_id", salon.id),
  ]);

  if (!clients?.length || !services?.length || !staff?.length) {
    return NextResponse.json({ error: "Données de base du salon démo manquantes" }, { status: 500 });
  }

  const now = new Date();
  const todayKey = parisDateKey(now);
  const appointments: Record<string, unknown>[] = [];

  for (let offset = -PAST_DAYS; offset <= FUTURE_DAYS; offset++) {
    const date = new Date(now);
    date.setDate(date.getDate() + offset);
    const dateKey = parisDateKey(date);
    if (date.getDay() === 0) continue; // fermé le dimanche

    const status = dateKey < todayKey ? "completed" : "confirmed";

    for (const member of staff) {
      for (const slot of SLOT_TIMES) {
        if (Math.random() > FILL_PROBABILITY) continue;
        const service = services[Math.floor(Math.random() * services.length)];
        const client = clients[Math.floor(Math.random() * clients.length)];
        appointments.push({
          salon_id: salon.id,
          client_id: client.id,
          service_id: service.id,
          staff_id: member.id,
          appointment_date: dateKey,
          start_time: `${slot}:00`,
          end_time: addMinutes(slot, service.duration_minutes),
          status,
          source: "web",
          price_cents: service.price_cents,
        });
      }
    }
  }

  const { error } = await supabase.from("appointments").insert(appointments);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ inserted: appointments.length });
}
