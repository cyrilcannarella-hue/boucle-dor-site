import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";

export async function POST(req: NextRequest) {
  const { to, firstName, serviceName, date, time } = await req.json();

  if (!to || !date || !time) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "Configuration Brevo manquante" }, { status: 500 });
  }

  let smsSender = "";
  let salonName = "Votre salon";
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const salon = await getCurrentSalon();
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data } = await supabase.from("salon_settings").select("sms_sender, salon_name").eq("salon_id", salon.id).single();
    if (data?.sms_sender) smsSender = data.sms_sender;
    if (data?.salon_name) salonName = data.salon_name;
  }

  const [year, month, day] = date.split("-");
  const dateFormatted = `${day}/${month}/${year}`;
  const prenom = firstName ? ` ${firstName}` : "";
  const prestation = serviceName ? ` pour ${serviceName}` : "";
  const content = `Bonjour${prenom} ! Votre RDV${prestation} est confirmé le ${dateFormatted} à ${time}. À bientôt chez ${salonName} !`;

  const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sender: smsSender,
      recipient: to,
      content,
      type: "transactional",
    }),
  });

  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err }, { status: res.status });
  }

  return NextResponse.json({ success: true });
}
