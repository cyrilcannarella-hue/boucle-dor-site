import { NextRequest, NextResponse } from "next/server";
import { getCurrentSalon } from "@/lib/salon";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Pré-remplissage du formulaire de réservation pour un client déjà connu
// (recherche par téléphone), scopé au salon résolu côté serveur.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const rawDigits = String(body?.phone ?? "").replace(/\D/g, "");
  const phone = rawDigits.startsWith("0033") && rawDigits.length === 13 ? "0" + rawDigits.slice(4)
    : rawDigits.startsWith("33") && rawDigits.length === 11 ? "0" + rawDigits.slice(2)
    : rawDigits;

  if (phone.length !== 10) {
    return NextResponse.json({ exists: false });
  }

  const salon = await getCurrentSalon();
  const supabase = createAdminSupabaseClient();

  const { data: client } = await supabase
    .from("clients")
    .select("id, first_name, last_name, email")
    .eq("salon_id", salon.id)
    .eq("phone", phone)
    .maybeSingle();

  if (!client) {
    return NextResponse.json({ exists: false });
  }

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appointment_answers(question_id, answer)")
    .eq("salon_id", salon.id)
    .eq("client_id", client.id)
    .order("appointment_date", { ascending: false })
    .order("start_time", { ascending: false })
    .limit(10);

  let lastAnswers: Record<string, string> = {};
  const recent = (appointments ?? []).find(
    (a) => Array.isArray(a.appointment_answers) && a.appointment_answers.length > 0
  );
  if (recent) {
    const answers = recent.appointment_answers as unknown as { question_id: string; answer: string }[];
    lastAnswers = Object.fromEntries(answers.map((a) => [a.question_id, a.answer]));
  }

  return NextResponse.json({
    exists: true,
    firstName: client.first_name ?? "",
    lastName: client.last_name ?? "",
    email: client.email ?? "",
    lastAnswers,
  });
}
