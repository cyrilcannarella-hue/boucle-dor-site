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
    let settled = false;

    const proceed = async (session: unknown) => {
      if (settled) return;
      settled = true;
      if (previewSalon) {
        await setPreviewSalonCookie(previewSalon);
      }
      router.replace(session ? "/back-office" : "/login");
    };

    // detectSessionInUrl traite le hash #access_token=... de façon asynchrone :
    // un getSession() immédiat peut arriver avant que la session soit posée.
    // onAuthStateChange réagit dès qu'elle est prête ; le timeout sert de filet
    // en cas d'absence de session (lien expiré, déjà utilisé, etc).
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) proceed(session);
    });

    const fallback = setTimeout(() => {
      supabase.auth.getSession().then(({ data: { session } }) => proceed(session));
    }, 2000);

    return () => {
      subscription.subscription.unsubscribe();
      clearTimeout(fallback);
    };
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-neutral-500">Connexion en cours…</p>
    </main>
  );
}
