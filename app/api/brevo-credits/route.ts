import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getCurrentSalon } from "@/lib/salon";

export async function GET() {
  let apiKey = process.env.BREVO_API_KEY;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (supabaseUrl && serviceKey) {
    const salon = await getCurrentSalon();
    const supabase = createClient(supabaseUrl, serviceKey);
    const { data } = await supabase.from("salon_settings").select("brevo_api_key").eq("salon_id", salon.id).single();
    if (data?.brevo_api_key) apiKey = data.brevo_api_key;
  }

  if (!apiKey) {
    return NextResponse.json({ error: "BREVO_API_KEY manquant" }, { status: 500 });
  }

  const res = await fetch("https://api.brevo.com/v3/account", {
    headers: { "api-key": apiKey },
    next: { revalidate: 300 },
  });

  if (!res.ok) {
    return NextResponse.json({ error: "Erreur Brevo" }, { status: res.status });
  }

  const data = await res.json();
  const smsPlan = (data.plan ?? []).find((p: { type: string }) => p.type === "sms");

  return NextResponse.json({ credits: smsPlan?.credits ?? null });
}
