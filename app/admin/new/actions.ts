"use server";

import { redirect } from "next/navigation";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;

export async function createSalonAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "trial");

  if (!name || !slug) {
    redirect("/admin/new?error=" + encodeURIComponent("Le nom et le slug sont requis."));
  }

  if (!SLUG_REGEX.test(slug)) {
    redirect(
      "/admin/new?error=" +
        encodeURIComponent("Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.")
    );
  }

  const supabase = createAdminSupabaseClient();

  const { data: salon, error: salonError } = await supabase
    .from("salons")
    .insert({ name, slug, status: "active" })
    .select("id")
    .single();

  if (salonError || !salon) {
    const message =
      salonError?.code === "23505"
        ? "Ce slug est déjà utilisé par un autre salon."
        : salonError?.message ?? "Erreur lors de la création du salon.";
    redirect("/admin/new?error=" + encodeURIComponent(message));
  }

  const { error: subscriptionError } = await supabase.from("subscriptions").insert({
    salon_id: salon.id,
    plan,
    status: plan === "trial" ? "trialing" : "active",
  });

  if (subscriptionError) {
    redirect("/admin/new?error=" + encodeURIComponent(subscriptionError.message));
  }

  redirect("/admin");
}
