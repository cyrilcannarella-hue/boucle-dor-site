"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { setPreviewSalonCookie } from "./actions";

export default function MagicCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const previewSalon = searchParams.get("preview_salon");
    const supabase = createClient();

    const proceed = async (hasSession: boolean) => {
      if (previewSalon) {
        await setPreviewSalonCookie(previewSalon);
      }
      router.replace(hasSession ? "/back-office" : "/login");
    };

    // createBrowserClient (@supabase/ssr) ne traite pas automatiquement le
    // hash #access_token=... d'un lien magique (contrairement au client
    // supabase-js classique) — on extrait et pose la session nous-mêmes.
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const accessToken = hashParams.get("access_token");
    const refreshToken = hashParams.get("refresh_token");

    if (accessToken && refreshToken) {
      supabase.auth
        .setSession({ access_token: accessToken, refresh_token: refreshToken })
        .then(({ data: { session } }) => proceed(!!session));
    } else {
      supabase.auth.getSession().then(({ data: { session } }) => proceed(!!session));
    }
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-neutral-500">Connexion en cours…</p>
    </main>
  );
}
