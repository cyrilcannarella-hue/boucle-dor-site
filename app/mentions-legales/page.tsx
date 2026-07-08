import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getCurrentSalon } from "@/lib/salon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Mentions légales",
};

export default async function MentionsLegalesPage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const [{ data: settings }, { data: salonRow }] = await Promise.all([
    supabase
      .from("salon_settings")
      .select("salon_name, address, phone, email, siret, legal_form")
      .eq("salon_id", salon.id)
      .maybeSingle(),
    supabase
      .from("salons")
      .select("owner_first_name, owner_last_name")
      .eq("id", salon.id)
      .maybeSingle(),
  ]);

  const salonName = settings?.salon_name || salon.name || "le salon";
  const address = settings?.address || null;
  const phone = settings?.phone || null;
  const email = settings?.email || null;
  const siret = settings?.siret || null;
  const legalForm = settings?.legal_form || null;
  const ownerName = [salonRow?.owner_first_name, salonRow?.owner_last_name].filter(Boolean).join(" ") || null;

  const Missing = () => <span className="italic text-amber-600">Non renseigné</span>;

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="mx-auto w-[min(760px,calc(100%-32px))] py-12">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">
          ← Retour à l'accueil
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">Mentions légales</h1>

        <div className="mt-8 grid gap-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Éditeur du site</h2>
            <p className="mt-2">
              {salonName}
              {legalForm ? ` — ${legalForm}` : ""}
              {siret ? (
                <>
                  {" "}
                  — SIRET : {siret}
                </>
              ) : (
                <>
                  {" "}
                  — SIRET : <Missing />
                </>
              )}
            </p>
            <p className="mt-1">
              Adresse : {address || <Missing />}
              <br />
              Téléphone : {phone || <Missing />}
              <br />
              E-mail : {email || <Missing />}
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Directeur de la publication</h2>
            <p className="mt-2">{ownerName || <Missing />}</p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Hébergement</h2>
            <p className="mt-2">
              Ce site est hébergé par :<br />
              Vercel Inc.
              <br />
              440 N Barranca Avenue #4133, Covina, CA 91723, États-Unis
              <br />
              <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-gray-900">
                vercel.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Propriété intellectuelle</h2>
            <p className="mt-2">
              L'ensemble des contenus présents sur ce site (textes, images, logo, mise en page) est la
              propriété de {salonName} ou de ses partenaires, sauf mention contraire, et ne peut être
              reproduit sans autorisation préalable.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Données personnelles</h2>
            <p className="mt-2">
              Le traitement des données personnelles collectées sur ce site est détaillé dans notre{" "}
              <Link href="/politique-de-confidentialite" className="underline hover:text-gray-900">
                politique de confidentialité
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Droit applicable</h2>
            <p className="mt-2">
              Le présent site est soumis au droit français. En cas de litige, et à défaut de résolution
              amiable, les tribunaux français seront seuls compétents.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
