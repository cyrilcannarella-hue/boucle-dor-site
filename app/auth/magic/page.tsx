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

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (previewSalon) {
        await setPreviewSalonCookie(previewSalon);
      }
      if (session) {
        router.replace("/back-office");
      } else {
        router.replace("/login");
      }
    });
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-white">
      <p className="text-sm text-neutral-500">Connexion en cours…</p>
    </main>
  );
}
