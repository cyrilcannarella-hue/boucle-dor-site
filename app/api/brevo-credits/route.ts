import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createHash } from "crypto";
import { getCurrentSalon } from "@/lib/salon";

export async function GET() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: "Config manquante" }, { status: 500 });
  }

  const salon = await getCurrentSalon();
  const supabase = createClient(supabaseUrl, serviceKey);
  const { data } = await supabase
    .from("salon_settings")
    .select("sms_provider, brevo_api_key, twilio_account_sid, twilio_auth_token, ovh_app_key, ovh_app_secret, ovh_consumer_key, ovh_service_name")
    .eq("salon_id", salon.id)
    .single();

  const provider = data?.sms_provider ?? "brevo";

  if (provider === "brevo") {
    if (!data?.brevo_api_key) return NextResponse.json({ error: "Clé API Brevo non configurée" }, { status: 500 });
    const res = await fetch("https://api.brevo.com/v3/account", {
      headers: { "api-key": data.brevo_api_key },
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ error: "Erreur Brevo" }, { status: res.status });
    const account = await res.json();
    const smsPlan = (account.plan ?? []).find((p: { type: string }) => p.type === "sms");
    // credits est le solde brevo, on divise par ~4.5 pour avoir des SMS
    const smsCount = smsPlan?.credits != null ? Math.floor(smsPlan.credits / 4.5) : null;
    return NextResponse.json({ provider: "brevo", credits: smsPlan?.credits ?? null, smsCount });
  }

  if (provider === "twilio") {
    if (!data?.twilio_account_sid || !data?.twilio_auth_token) {
      return NextResponse.json({ error: "Twilio non configuré" }, { status: 500 });
    }
    const credentials = Buffer.from(`${data.twilio_account_sid}:${data.twilio_auth_token}`).toString("base64");
    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${data.twilio_account_sid}/Balance.json`, {
      headers: { Authorization: `Basic ${credentials}` },
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ error: "Erreur Twilio" }, { status: res.status });
    const account = await res.json();
    return NextResponse.json({ provider: "twilio", balance: account.balance, currency: account.currency });
  }

  if (provider === "ovh") {
    if (!data?.ovh_app_key || !data?.ovh_app_secret || !data?.ovh_consumer_key || !data?.ovh_service_name) {
      return NextResponse.json({ error: "OVH non configuré" }, { status: 500 });
    }
    const url = `https://eu.api.ovh.com/1.0/sms/${data.ovh_service_name}`;
    const timestamp = Math.round(Date.now() / 1000);
    const signature = "$1$" + createHash("sha1")
      .update([data.ovh_app_secret, data.ovh_consumer_key, "GET", url, "", timestamp].join("+"))
      .digest("hex");
    const res = await fetch(url, {
      headers: {
        "X-Ovh-Application": data.ovh_app_key,
        "X-Ovh-Timestamp": String(timestamp),
        "X-Ovh-Signature": signature,
        "X-Ovh-Consumer": data.ovh_consumer_key,
      },
      next: { revalidate: 300 },
    });
    if (!res.ok) return NextResponse.json({ error: "Erreur OVH" }, { status: res.status });
    const account = await res.json();
    return NextResponse.json({ provider: "ovh", creditsLeft: account.creditsLeft });
  }

  return NextResponse.json({ error: "Fournisseur inconnu" }, { status: 400 });
}
