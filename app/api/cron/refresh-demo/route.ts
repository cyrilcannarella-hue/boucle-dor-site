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

// IDs stables des prestataires et prestations du salon démo.
// Ces IDs ne changent jamais (jamais supprimés par le cron).
const DEMO_STAFF_CAMILLE = "d0fce9db-bd3c-4da3-8329-7c7961fbb7e6";
const DEMO_STAFF_LEA     = "9aa8501f-8eec-431d-80ad-3208b6322547";
const DEMO_SVC_COUPE_F   = { id: "26156f57-cbe3-4e36-8571-bd73b5fd5495", duration: 45, price: 4500 };
const DEMO_SVC_COUPE_H   = { id: "acc1d28e-5318-42f2-b961-8747730476a7", duration: 30, price: 3000 };
const DEMO_SVC_COLORATION= { id: "6a25308a-41e9-4e18-936a-2e961c3665cc", duration: 90, price: 7500 };
const DEMO_SVC_BRUSHING  = { id: "7ee87204-4d0d-4864-b4b7-ecd19f1d4b63", duration: 30, price: 2500 };

// Téléphones des clients utilisés pour les notifications web permanentes.
// Leurs IDs sont stables (jamais supprimés par le cron).
const NOTIF_PHONES = ["0700000001", "0700000002", "0700000003", "0700000007"];

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

  const [{ data: clients }, { data: services }, { data: staff }, { data: notifClients }] = await Promise.all([
    supabase.from("clients").select("id").eq("salon_id", salon.id),
    supabase.from("services").select("id, price_cents, duration_minutes").eq("salon_id", salon.id),
    supabase.from("staff").select("id").eq("salon_id", salon.id),
    supabase.from("clients").select("id, phone").eq("salon_id", salon.id).in("phone", NOTIF_PHONES),
  ]);

  if (!clients?.length || !services?.length || !staff?.length) {
    return NextResponse.json({ error: "Données de base du salon démo manquantes" }, { status: 500 });
  }

  const now = new Date();
  const todayKey = parisDateKey(now);

  // Sources réalistes pour les appointments générés automatiquement.
  // "web" est exclu ici pour ne pas polluer le panneau Notifications.
  const BULK_SOURCES = ["admin", "admin", "phone"];

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
        const source = BULK_SOURCES[Math.floor(Math.random() * BULK_SOURCES.length)];
        appointments.push({
          salon_id: salon.id,
          client_id: client.id,
          service_id: service.id,
          staff_id: member.id,
          appointment_date: dateKey,
          start_time: `${slot}:00`,
          end_time: addMinutes(slot, service.duration_minutes),
          status,
          source,
          price_cents: service.price_cents,
        });
      }
    }
  }

  const { error } = await supabase.from("appointments").insert(appointments);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Notifications web permanentes — 4 réservations en ligne échelonnées
  // dans la matinée, toujours sur des dates futures, recreées chaque jour
  // pour que le panneau Notifications ne soit jamais vide dans la démo.
  const clientByPhone = Object.fromEntries(
    (notifClients ?? []).map((c) => [c.phone as string, c.id as string])
  );

  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.getDay() === 0) tomorrow.setDate(tomorrow.getDate() + 1);
  const day2 = new Date(now);
  day2.setDate(day2.getDate() + 2);
  if (day2.getDay() === 0) day2.setDate(day2.getDate() + 1);
  const day3 = new Date(now);
  day3.setDate(day3.getDate() + 3);
  if (day3.getDay() === 0) day3.setDate(day3.getDate() + 1);

  const webNotifications = [
    {
      client_phone: "0700000001",
      service: DEMO_SVC_COUPE_F,
      staff_id: DEMO_STAFF_CAMILLE,
      appointment_date: parisDateKey(tomorrow),
      start_time: "10:00:00",
      // créée il y a ~2h30 (tôt le matin)
      created_at: new Date(now.getTime() - 150 * 60 * 1000).toISOString(),
    },
    {
      client_phone: "0700000007",
      service: DEMO_SVC_BRUSHING,
      staff_id: DEMO_STAFF_LEA,
      appointment_date: parisDateKey(day2),
      start_time: "11:00:00",
      // créée il y a ~1h05
      created_at: new Date(now.getTime() - 65 * 60 * 1000).toISOString(),
    },
    {
      client_phone: "0700000002",
      service: DEMO_SVC_COUPE_H,
      staff_id: DEMO_STAFF_LEA,
      appointment_date: parisDateKey(day2),
      start_time: "14:30:00",
      // créée il y a ~22 min
      created_at: new Date(now.getTime() - 22 * 60 * 1000).toISOString(),
    },
    {
      client_phone: "0700000003",
      service: DEMO_SVC_COLORATION,
      staff_id: DEMO_STAFF_CAMILLE,
      appointment_date: parisDateKey(day3),
      start_time: "09:00:00",
      // créée il y a ~7 min
      created_at: new Date(now.getTime() - 7 * 60 * 1000).toISOString(),
    },
  ];

  const notifRows = webNotifications
    .filter((n) => clientByPhone[n.client_phone])
    .map((n) => ({
      salon_id: salon.id,
      client_id: clientByPhone[n.client_phone],
      service_id: n.service.id,
      staff_id: n.staff_id,
      appointment_date: n.appointment_date,
      start_time: n.start_time,
      end_time: addMinutes(n.start_time.slice(0, 5), n.service.duration),
      status: "confirmed",
      source: "web",
      price_cents: n.service.price,
      created_at: n.created_at,
    }));

  if (notifRows.length > 0) {
    await supabase.from("appointments").insert(notifRows);
  }

  return NextResponse.json({ inserted: appointments.length, notifications: notifRows.length });
}
