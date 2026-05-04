"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("");

    try {
      setLoading(true);

      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw new Error((error as Error).message);

      router.push("/back-office");
      router.refresh();
    } catch (error: unknown) {
      setStatus((error as Error).message ?? "Impossible de se connecter.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#f6f1ea] text-[#1f1b17]">
      <section className="mx-auto flex min-h-screen w-[min(520px,calc(100%-32px))] items-center justify-center py-10">
        <div className="w-full rounded-[32px] border border-[#e7ddd0] bg-[#fcfaf7] p-8 shadow-[0_18px_50px_rgba(0,0,0,0.06)]">
          <div className="mb-2 text-xs font-bold uppercase tracking-[0.22em] text-[var(--gold)]">
            Espace salon
          </div>
          <h1 className="text-4xl">Connexion</h1>
          <p className="mt-3 text-[#6e655c]">
            Connectez-vous pour accéder au back-office.
          </p>

          <form onSubmit={handleLogin} className="mt-6 grid gap-4">
            <label className="grid gap-2 text-sm text-[#6e655c]">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-[16px] border border-[#e7ddd0] bg-white px-4 py-3 outline-none"
              />
            </label>

            <label className="grid gap-2 text-sm text-[#6e655c]">
              Mot de passe
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="rounded-[16px] border border-[#e7ddd0] bg-white px-4 py-3 outline-none"
              />
            </label>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 rounded-full bg-[#111111] px-6 py-4 font-semibold text-white hover:opacity-90 disabled:opacity-50"
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