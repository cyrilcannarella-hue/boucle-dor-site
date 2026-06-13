import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

function getTomorrowParis(): string {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  return tomorrow.toLocaleDateString("fr-CA", { timeZone: "Europe/Paris" });
}

function formatPhoneE164(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0033")) return `+33${digits.slice(4)}`;
  if (digits.startsWith("33") && digits.length === 11) return `+${digits}`;
  if (digits.startsWith("0") && digits.length === 10) return `+33${digits.slice(1)}`;
  return `+${digits}`;
}

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const brevoKey = process.env.BREVO_API_KEY;

  if (!supabaseUrl || !serviceKey || !brevoKey) {
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const tomorrow = getTomorrowParis();

  const { data: salons } = await supabase.from("salons").select("id, name").eq("status", "active");

  let sent = 0;
  let failed = 0;

  for (const salon of salons ?? []) {
    const { data: settingsData } = await supabase.from("salon_settings").select("sms_sender, salon_name").eq("salon_id", salon.id).single();
    const smsSender = settingsData?.sms_sender || "BoucleDor";
    const salonName = settingsData?.salon_name || salon.name;

    const { data: appointments, error } = await supabase
      .from("appointments")
      .select("start_time, clients(first_name, phone), services(name)")
      .eq("salon_id", salon.id)
      .eq("appointment_date", tomorrow)
      .eq("status", "confirmed");

    if (error) continue;

    const results = await Promise.allSettled(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (appointments ?? []).map(async (appt: any) => {
        const client = Array.isArray(appt.clients) ? appt.clients[0] : appt.clients;
        const service = Array.isArray(appt.services) ? appt.services[0] : appt.services;

        const phone = client?.phone;
        if (!phone) return;

        const to = formatPhoneE164(phone);
        const prenom = client?.first_name ? ` ${client.first_name}` : "";
        const prestation = service?.name ? ` pour ${service.name}` : "";
        const heure = appt.start_time?.slice(0, 5) ?? "";
        const content = `Rappel : votre RDV${prestation} est demain à ${heure} chez ${salonName}. À bientôt ! 💇‍♀️`;

        const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
          method: "POST",
          headers: { "api-key": brevoKey, "Content-Type": "application/json" },
          body: JSON.stringify({ sender: smsSender, recipient: to, content, type: "transactional" }),
        });

        if (!res.ok) throw new Error(await res.text());
      })
    );

    sent += results.filter((r) => r.status === "fulfilled").length;
    failed += results.filter((r) => r.status === "rejected").length;
  }

  return NextResponse.json({ tomorrow, sent, failed });
}
