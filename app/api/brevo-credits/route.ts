import { NextResponse } from "next/server";

export async function GET() {
  const apiKey = process.env.BREVO_API_KEY;
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
