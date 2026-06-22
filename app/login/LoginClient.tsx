"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { SiteFont } from "@/components/SiteFont";
import { SitePattern, getPatternBgLayer } from "@/components/SitePattern";

export type SalonSettings = {
  id: string;
  color_page_bg?: string | null;
  color_header_bg?: string | null;
  color_text_main?: string | null;
  color_card_border?: string | null;
  color_accents?: string | null;
  color_nav_text?: string | null;
  color_contact_bg?: string | null;
  color_hero_bg?: string | null;
  site_font?: string | null;
  font_salon_name?: string | null;
  bg_pattern?: string | null;
};

function hexToRgb(hex: string) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return `${r},${g},${b}`;
}

function contrastText(hex: string): string {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.40 ? "#111827" : "#ffffff";
}

export function LoginClient({ initialSettings }: { initialSettings: SalonSettings | null }) {
  const router = useRouter();
  const supabase = createClient();
  const settings = initialSettings;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "salon_access_denied") {
      setStatus("Ce compte n'a pas accès à ce salon. Connectez-vous avec le compte associé à ce salon.");
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error((error as Error).message);
      router.push("/back-office");
      router.refresh();
    } catch (error: unknown) {
      setStatus((error as Error).message ?? "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  const colorPageBg = settings?.color_hero_bg || settings?.color_contact_bg || settings?.color_page_bg || "#111827";
  const bgPatternLayer = getPatternBgLayer(settings?.bg_pattern, colorPageBg);
  const colorTextMain = settings?.color_text_main || "#111827";
  const colorCardBorder = settings?.color_card_border || "#e5e7eb";
  const colorAccents = settings?.color_accents || "#4f46e5";

  return (
    <main
      className="min-h-screen"
      style={{ color: "#ffffff", background: `${bgPatternLayer ? bgPatternLayer + "," : ""}radial-gradient(circle at top left, rgba(${hexToRgb(colorAccents)},0.25), transparent 40%), ${colorPageBg}` }}
    >
      <SiteFont font={settings?.site_font} salonNameFont={settings?.font_salon_name} />
      <SitePattern pattern={settings?.bg_pattern} />
      <section className="mx-auto flex min-h-screen w-[min(520px,calc(100%-32px))] items-center justify-center py-10">
        <div
          className="w-full rounded-[32px] p-8 shadow-[0_18px_50px_rgba(0,0,0,0.3)]"
          style={{ border: `1px solid ${colorCardBorder}`, backgroundColor: settings?.color_page_bg || "#ffffff" }}
        >
          <div
            className="mb-3 inline-flex rounded-full border px-4 py-1.5 text-xs font-bold uppercase tracking-[0.22em]"
            style={{ color: colorAccents, borderColor: `${colorAccents}40`, backgroundColor: `${colorAccents}12` }}
          >
            Espace salon
          </div>
          <h1 className="text-4xl" style={{ color: colorTextMain }}>Connexion</h1>
          <p className="mt-3" style={{ color: `${colorTextMain}99` }}>
            Connectez-vous pour accéder au back-office.
          </p>

          <form onSubmit={handleLogin} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm" style={{ color: `${colorTextMain}99` }}>
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-[16px] bg-white px-4 py-3 outline-none"
                style={{ border: `1px solid ${colorCardBorder}`, color: colorTextMain }}
              />
            </label>

            <label className="grid gap-2 text-sm" style={{ color: `${colorTextMain}99` }}>
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-[16px] bg-white px-4 py-3 outline-none"
                style={{ border: `1px solid ${colorCardBorder}`, color: colorTextMain }}
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full px-6 py-4 font-semibold hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: colorAccents, color: contrastText(colorAccents) }}
            >
              {loading ? "Connexion..." : "Se connecter"}
            </button>
          </form>

          {status ? (
            <div className="mt-4 rounded-[16px] border border-[#efc9c9] bg-[#fff1f1] px-4 py-3 text-sm text-[#a33a3a]">
              {status}
            </div>
          ) : null}
        </div>
      </section>
    </main>
  );
}
