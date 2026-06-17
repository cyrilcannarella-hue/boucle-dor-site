import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getCurrentSalon } from "@/lib/salon";

export async function POST(req: NextRequest) {
  const { to, firstName, serviceName, date, time } = await req.json();

  if (!to || !date || !time) {
    return NextResponse.json({ error: "Paramètres manquants" }, { status: 400 });
  }

  let smsProvider = "brevo";
  let smsSender = "";
  let salonName = "Votre salon";
  let brevoApiKey: string | null = null;
  let twilioAccountSid: string | null = null;
  let twilioAuthToken: string | null = null;
  let twilioFromNumber: string | null = null;
  let twilioSenderId: string | null = null;
  let ovhAppKey: string | null = null;
  let ovhAppSecret: string | null = null;
  let ovhConsumerKey: string | null = null;
  let ovhServiceName: string | null = null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const salon = await getCurrentSalon();
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data } = await supabase
      .from("salon_settings")
      .select("sms_sender, salon_name, sms_provider, brevo_api_key, twilio_account_sid, twilio_auth_token, twilio_from_number, twilio_sender_id, ovh_app_key, ovh_app_secret, ovh_consumer_key, ovh_service_name")
      .eq("salon_id", salon.id)
      .single();
    if (data?.sms_sender) smsSender = data.sms_sender;
    if (data?.salon_name) salonName = data.salon_name;
    if (data?.sms_provider) smsProvider = data.sms_provider;
    if (data?.brevo_api_key) brevoApiKey = data.brevo_api_key;
    if (data?.twilio_account_sid) twilioAccountSid = data.twilio_account_sid;
    if (data?.twilio_auth_token) twilioAuthToken = data.twilio_auth_token;
    if (data?.twilio_from_number) twilioFromNumber = data.twilio_from_number;
    if (data?.twilio_sender_id) twilioSenderId = data.twilio_sender_id;
    if (data?.ovh_app_key) ovhAppKey = data.ovh_app_key;
    if (data?.ovh_app_secret) ovhAppSecret = data.ovh_app_secret;
    if (data?.ovh_consumer_key) ovhConsumerKey = data.ovh_consumer_key;
    if (data?.ovh_service_name) ovhServiceName = data.ovh_service_name;
  }

  const [year, month, day] = date.split("-");
  const dateFormatted = `${day}/${month}/${year}`;
  const prenom = firstName ? ` ${firstName}` : "";
  const prestation = serviceName ? ` pour ${serviceName}` : "";
  const content = `Bonjour${prenom} ! Votre RDV${prestation} est confirmé le ${dateFormatted} à ${time}. À bientôt chez ${salonName} !`;

  if (smsProvider === "twilio") {
    if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
      return NextResponse.json({ skipped: true });
    }
    const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
    const body = new URLSearchParams({ To: to, From: twilioSenderId || twilioFromNumber, Body: content });
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  }

  if (smsProvider === "ovh") {
    if (!ovhAppKey || !ovhAppSecret || !ovhConsumerKey || !ovhServiceName) {
      return NextResponse.json({ skipped: true });
    }
    const url = `https://eu.api.ovh.com/1.0/sms/${ovhServiceName}/jobs`;
    const body = JSON.stringify({ receivers: [to], message: content, sender: smsSender || undefined });
    const timestamp = Math.round(Date.now() / 1000);
    const signature = "$1$" + createHash("sha1")
      .update([ovhAppSecret, ovhConsumerKey, "POST", url, body, timestamp].join("+"))
      .digest("hex");
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Ovh-Application": ovhAppKey,
        "X-Ovh-Timestamp": String(timestamp),
        "X-Ovh-Signature": signature,
        "X-Ovh-Consumer": ovhConsumerKey,
      },
      body,
    });
    if (!res.ok) {
      const err = await res.json();
      return NextResponse.json({ error: err }, { status: res.status });
    }
    return NextResponse.json({ success: true });
  }

  // Brevo (défaut)
  if (!brevoApiKey) {
    return NextResponse.json({ skipped: true });
  }
  const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
    method: "POST",
    headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
    body: JSON.stringify({ sender: smsSender, recipient: to, content, type: "transactional" }),
  });
  if (!res.ok) {
    const err = await res.json();
    return NextResponse.json({ error: err }, { status: res.status });
  }
  return NextResponse.json({ success: true });
}
