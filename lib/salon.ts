import { cookies, headers } from "next/headers";
import { createClient } from "@supabase/supabase-js";

export type Salon = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

const DEFAULT_SALON_SLUG = "boucle-dor";
export const PREVIEW_SALON_COOKIE = "preview_salon";

async function resolveSalonSlug(): Promise<string> {
  const cookieStore = await cookies();
  const previewSlug = cookieStore.get(PREVIEW_SALON_COOKIE)?.value;
  if (previewSlug) return previewSlug;

  const headersList = await headers();
  const host = headersList.get("host") ?? "";
  const hostname = host.split(":")[0];
  const parts = hostname.split(".");

  // {slug}.monsaas.fr -> on prend le sous-domaine comme slug
  if (parts.length >= 3 && parts[parts.length - 2] === "monsaas" && parts[0] !== "www") {
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

  const { data } = await supabase.from("salons").select("id, slug, name, status").eq("slug", slug).maybeSingle();
  if (data) return data;

  const { data: fallback } = await supabase
    .from("salons")
    .select("id, slug, name, status")
    .eq("slug", DEFAULT_SALON_SLUG)
    .single();

  return fallback as Salon;
}
