import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { DEFAULT_SALON_SLUG, PREVIEW_SALON_COOKIE, slugFromHostname } from "@/lib/salon";

/**
 * Vérifie que l'utilisateur connecté est membre du salon résolu pour cette requête
 * (cookie de prévisualisation, sinon hostname, sinon fallback boucle-dor — même
 * précédence que resolveSalonSlug() dans lib/salon.ts). Bypass RLS volontairement
 * (service role) : on doit pouvoir constater l'ABSENCE de membership, ce que RLS ne
 * peut pas exprimer pour un non-membre.
 */
async function isAuthorizedForCurrentSalon(request: NextRequest, userId: string): Promise<boolean> {
  const admin = createAdminSupabaseClient();
  const previewSlug = request.cookies.get(PREVIEW_SALON_COOKIE)?.value;

  if (previewSlug) {
    const { data: salon } = await admin.from("salons").select("id").eq("slug", previewSlug).maybeSingle();
    if (salon) {
      const { data: member } = await admin
        .from("salon_members").select("id").eq("salon_id", salon.id).eq("user_id", userId).maybeSingle();
      if (member) return true;
    }
    // Cookie invalide ou non autorisé — on ignore et on retombe sur le hostname, comme resolveSalonSlug().
  }

  const hostname = (request.headers.get("host") ?? "").split(":")[0];
  const slug = slugFromHostname(hostname);
  const { data: salon } = await admin.from("salons").select("id").eq("slug", slug).maybeSingle();
  const finalSalon = salon ?? (await admin.from("salons").select("id").eq("slug", DEFAULT_SALON_SLUG).maybeSingle()).data;
  if (!finalSalon) return false;

  const { data: member } = await admin
    .from("salon_members").select("id").eq("salon_id", finalSalon.id).eq("user_id", userId).maybeSingle();
  return !!member;
}

export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );

          response = NextResponse.next({
            request,
          });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isBackOfficeRoute = request.nextUrl.pathname.startsWith("/back-office");
  const isLoginRoute = request.nextUrl.pathname === "/login";

  if (isBackOfficeRoute && !user) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if ((isBackOfficeRoute || isLoginRoute) && user) {
    const authorized = await isAuthorizedForCurrentSalon(request, user.id);

    if (isBackOfficeRoute && !authorized) {
      const url = request.nextUrl.clone();
      url.pathname = "/login";
      url.searchParams.set("error", "salon_access_denied");
      return NextResponse.redirect(url);
    }

    if (isLoginRoute && authorized) {
      const url = request.nextUrl.clone();
      url.pathname = "/back-office";
      return NextResponse.redirect(url);
    }
  }

  return response;
}

export const config = {
  matcher: ["/login", "/back-office/:path*"],
};
