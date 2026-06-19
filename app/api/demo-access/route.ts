import { NextResponse } from "next/server";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

// Connexion automatique (sans identifiants) au salon démo public, depuis
// les badges "Agenda" de la page d'accueil agenda-plus.fr. Les écritures
// restent neutralisées côté client (voir utils/supabase/client.ts).
export async function GET() {
  const supabase = createAdminSupabaseClient();

  const { data: salon } = await supabase.from("salons").select("id").eq("slug", "demo").maybeSingle();
  if (!salon) {
    return new NextResponse("Salon démo introuvable.", { status: 404 });
  }

  const { data: member } = await supabase
    .from("salon_members")
    .select("user_id")
    .eq("salon_id", salon.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();

  if (!member) {
    return new NextResponse("Propriétaire du salon démo introuvable.", { status: 404 });
  }

  const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
  if (!userData?.user?.email) {
    return new NextResponse("Compte démo introuvable.", { status: 404 });
  }

  const { data: linkData, error } = await supabase.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
    options: { redirectTo: "https://demo.agenda-plus.fr/auth/magic" },
  });

  if (error || !linkData?.properties?.action_link) {
    return new NextResponse("Impossible de générer l'accès démo.", { status: 500 });
  }

  return NextResponse.redirect(linkData.properties.action_link, { status: 303 });
}
