import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getCurrentSalon } from "@/lib/salon";

export async function POST(req: NextRequest) {
  const { message, dryRun, onlyWithAppointments } = await req.json();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Configuration manquante" }, { status: 500 });
  }

  const salon = await getCurrentSalon();
  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: settingsData } = await supabase
    .from("salon_settings")
    .select("sms_sender, salon_name, sms_provider, brevo_api_key, twilio_account_sid, twilio_auth_token, twilio_from_number, twilio_sender_id, ovh_app_key, ovh_app_secret, ovh_consumer_key, ovh_service_name")
    .eq("salon_id", salon.id)
    .single();

  const { data: clientRows } = await supabase
    .from("clients")
    .select("id, first_name, phone")
    .eq("salon_id", salon.id)
    .not("phone", "is", null)
    .neq("phone", "");

  let recipients = (clientRows ?? []).filter((c) => c.phone && c.phone.trim() !== "");

  if (onlyWithAppointments) {
    const { data: appointmentRows } = await supabase
      .from("appointments")
      .select("client_id")
      .eq("salon_id", salon.id);
    const clientIdsWithAppointments = new Set((appointmentRows ?? []).map((a) => a.client_id));
    recipients = recipients.filter((c) => clientIdsWithAppointments.has(c.id));
  }

  if (dryRun) {
    return NextResponse.json({ count: recipients.length });
  }

  if (!message || message.trim() === "") {
    return NextResponse.json({ error: "Message manquant" }, { status: 400 });
  }

  const provider = settingsData?.sms_provider ?? "brevo";
  const smsSender = settingsData?.sms_sender ?? "";
  const brevoApiKey = settingsData?.brevo_api_key ?? null;
  const twilioAccountSid = settingsData?.twilio_account_sid ?? null;
  const twilioAuthToken = settingsData?.twilio_auth_token ?? null;
  const twilioFromNumber = settingsData?.twilio_from_number ?? null;
  const twilioSenderId = settingsData?.twilio_sender_id ?? null;
  const ovhAppKey = settingsData?.ovh_app_key ?? null;
  const ovhAppSecret = settingsData?.ovh_app_secret ?? null;
  const ovhConsumerKey = settingsData?.ovh_consumer_key ?? null;
  const ovhServiceName = settingsData?.ovh_service_name ?? null;

  let sent = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const client of recipients) {
    const phone = client.phone as string;
    try {
      if (provider === "twilio") {
        if (!twilioAccountSid || !twilioAuthToken || !twilioFromNumber) {
          failed++;
          errors.push("Twilio non configuré");
          break;
        }
        const credentials = Buffer.from(`${twilioAccountSid}:${twilioAuthToken}`).toString("base64");
        const body = new URLSearchParams({ To: phone, From: twilioSenderId || twilioFromNumber, Body: message });
        const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`, {
          method: "POST",
          headers: { Authorization: `Basic ${credentials}`, "Content-Type": "application/x-www-form-urlencoded" },
          body: body.toString(),
        });
        if (!res.ok) {
          failed++;
          const err = await res.json();
          errors.push(`${phone}: ${JSON.stringify(err)}`);
        } else {
          sent++;
        }
      } else if (provider === "ovh") {
        if (!ovhAppKey || !ovhAppSecret || !ovhConsumerKey || !ovhServiceName) {
          failed++;
          errors.push("OVH non configuré");
          break;
        }
        const url = `https://eu.api.ovh.com/1.0/sms/${ovhServiceName}/jobs`;
        const bodyStr = JSON.stringify({ receivers: [phone], message, sender: smsSender || undefined });
        const timestamp = Math.round(Date.now() / 1000);
        const signature = "$1$" + createHash("sha1")
          .update([ovhAppSecret, ovhConsumerKey, "POST", url, bodyStr, timestamp].join("+"))
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
          body: bodyStr,
        });
        if (!res.ok) {
          failed++;
          const err = await res.json();
          errors.push(`${phone}: ${JSON.stringify(err)}`);
        } else {
          sent++;
        }
      } else {
        // Brevo (default)
        if (!brevoApiKey) {
          return NextResponse.json({ error: "Clé API Brevo manquante" }, { status: 400 });
        }
        const res = await fetch("https://api.brevo.com/v3/transactionalSMS/sms", {
          method: "POST",
          headers: { "api-key": brevoApiKey, "Content-Type": "application/json" },
          body: JSON.stringify({ sender: smsSender, recipient: phone, content: message, type: "transactional" }),
        });
        if (!res.ok) {
          failed++;
          const err = await res.json();
          errors.push(`${phone}: ${JSON.stringify(err)}`);
        } else {
          sent++;
        }
      }
    } catch (e: unknown) {
      failed++;
      errors.push(`${phone}: ${(e as Error).message}`);
    }
  }

  return NextResponse.json({ sent, failed, errors: errors.slice(0, 10) });
}
