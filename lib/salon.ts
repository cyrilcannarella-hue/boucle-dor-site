import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";
import { createServerSupabaseClient } from "./supabase/server-client";
import { createAdminSupabaseClient } from "./supabase/admin-client";

export type Salon = {
  id: string;
  slug: string;
  name: string;
  status: string;
  is_test: boolean;
};

const DEFAULT_SALON_SLUG = "boucle-dor";
export const PREVIEW_SALON_COOKIE = "preview_salon";

async function resolveSalonSlug(): Promise<string> {
  const cookieStore = await cookies();
  const previewSlug = cookieStore.get(PREVIEW_SALON_COOKIE)?.value;

  if (previewSlug) {
    // Vérifie que l'utilisateur connecté est bien membre du salon en prévisualisation
    const serverClient = await createServerSupabaseClient();
    const { data: { user } } = await serverClient.auth.getUser();

    if (user) {
      const admin = createAdminSupabaseClient();
      const { data: salon } = await admin
        .from("salons")
        .select("id")
        .eq("slug", previewSlug)
        .maybeSingle();

      if (salon) {
        const { data: member } = await admin
          .from("salon_members")
          .select("id")
          .eq("salon_id", salon.id)
          .eq("user_id", user.id)
          .maybeSingle();

        if (member) return previewSlug;
      }
    }
    // Cookie invalide ou non autorisé — on ignore et on continue
  }

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  // {slug}.agenda-plus.fr ou {slug}.monsaas.fr -> on prend le sous-domaine comme slug
  const SAAS_DOMAINS = ["agenda-plus", "monsaas"];
  if (parts.length >= 3 && SAAS_DOMAINS.includes(parts[parts.length - 2]) && parts[0] !== "www") {
    return parts[0];
  }

  return DEFAULT_SALON_SLUG;
}

/**
 * Résout le salon courant (server-only) à partir du hostname de la requête.
 * Fallback sur Boucle d'Or si aucun sous-domaine reconnu (localhost, domaine custom, etc).
 */
export async function getCurrentSalon(): Promise<Salon> {
  const slug = await resolveSalonSlug();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data } = await supabase.from("salons").select("id, slug, name, status, is_test").eq("slug", slug).maybeSingle();
  if (data) return data;

  const { data: fallback } = await supabase
    .from("salons")
    .select("id, slug, name, status, is_test")
    .eq("slug", DEFAULT_SALON_SLUG)
    .single();

  return fallback as Salon;
}
