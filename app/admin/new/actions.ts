"use server";

import { redirect } from "next/navigation";
import crypto from "crypto";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

const SLUG_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function generateTempPassword(): string {
  return crypto.randomBytes(12).toString("base64url");
}

export async function createSalonAction(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "").trim().toLowerCase();
  const plan = String(formData.get("plan") ?? "trial");
  const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();

  if (!name || !slug || !ownerEmail) {
    redirect("/admin/new?error=" + encodeURIComponent("Le nom, le slug et l'email du propriétaire sont requis."));
  }

  if (!SLUG_REGEX.test(slug)) {
    redirect(
      "/admin/new?error=" +
        encodeURIComponent("Le slug ne peut contenir que des lettres minuscules, chiffres et tirets.")
    );
  }

  if (!EMAIL_REGEX.test(ownerEmail)) {
    redirect("/admin/new?error=" + encodeURIComponent("L'email du propriétaire est invalide."));
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
    await supabase.from("salons").delete().eq("id", salon.id);
    redirect("/admin/new?error=" + encodeURIComponent(subscriptionError.message));
  }

  const { error: settingsError } = await supabase.from("salon_settings").insert({
    salon_id: salon.id,
    salon_name: name,
  });

  if (settingsError) {
    await supabase.from("salons").delete().eq("id", salon.id);
    redirect("/admin/new?error=" + encodeURIComponent(settingsError.message));
  }

  const tempPassword = generateTempPassword();
  const { data: userData, error: userError } = await supabase.auth.admin.createUser({
    email: ownerEmail,
    password: tempPassword,
    email_confirm: true,
  });

  if (userError || !userData?.user) {
    await supabase.from("salons").delete().eq("id", salon.id);
    redirect("/admin/new?error=" + encodeURIComponent(userError?.message ?? "Erreur lors de la création du compte propriétaire."));
  }

  const { error: memberError } = await supabase.from("salon_members").insert({
    salon_id: salon.id,
    user_id: userData.user.id,
    role: "owner",
  });

  if (memberError) {
    await supabase.auth.admin.deleteUser(userData.user.id);
    await supabase.from("salons").delete().eq("id", salon.id);
    redirect("/admin/new?error=" + encodeURIComponent(memberError.message));
  }

  redirect(
    "/admin/new?success=1" +
      `&slug=${encodeURIComponent(slug)}` +
      `&email=${encodeURIComponent(ownerEmail)}` +
      `&password=${encodeURIComponent(tempPassword)}`
  );
}
