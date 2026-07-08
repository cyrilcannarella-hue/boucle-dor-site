import { headers } from "next/headers";

/**
 * URL absolue du salon courant, dérivée du hostname de la requête (sous-domaine
 * agenda-plus.fr ou domaine par défaut) — nécessaire pour le sitemap/robots/canonical
 * puisqu'il n'existe pas un seul domaine fixe (multi-tenant, pas de NEXT_PUBLIC_SITE_URL).
 */
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "boucle-dor.vercel.app";
  const protocol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${protocol}://${host}`;
}
