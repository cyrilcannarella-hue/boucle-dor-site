import Link from "next/link";
import { createClient } from "@supabase/supabase-js";
import type { Metadata } from "next";
import { getCurrentSalon } from "@/lib/salon";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Politique de confidentialité",
};

export default async function PolitiqueConfidentialitePage() {
  const salon = await getCurrentSalon();
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  );

  const { data: settings } = await supabase
    .from("salon_settings")
    .select("salon_name, address, phone")
    .eq("salon_id", salon.id)
    .maybeSingle();

  const salonName = settings?.salon_name || salon.name || "le salon";
  const address = settings?.address || null;
  const phone = settings?.phone || null;

  return (
    <main className="min-h-screen bg-white text-gray-800">
      <div className="mx-auto w-[min(760px,calc(100%-32px))] py-12">
        <Link href="/" className="text-sm text-gray-500 hover:text-gray-800">
          ← Retour à l'accueil
        </Link>

        <h1 className="mt-6 text-2xl font-bold text-gray-900">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-gray-500">Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}</p>

        <div className="mt-8 grid gap-8 text-sm leading-relaxed text-gray-700">
          <section>
            <h2 className="text-lg font-semibold text-gray-900">1. Responsable du traitement</h2>
            <p className="mt-2">
              {salonName}{address ? `, ${address}` : ""}
              {phone ? ` — ${phone}` : ""} est responsable du traitement des données personnelles
              collectées via ce site, dans le cadre de la gestion de ses rendez-vous et de sa relation client.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">2. Données collectées</h2>
            <p className="mt-2">
              Lors d'une prise de rendez-vous en ligne, nous collectons : nom, prénom, numéro de
              téléphone, adresse e-mail (facultative), ainsi que les éventuelles réponses au
              questionnaire ou messages laissés au salon. Ces informations sont saisies volontairement
              par vous lors de la réservation.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">3. Finalités du traitement</h2>
            <p className="mt-2">
              Ces données sont utilisées uniquement pour : la gestion de vos rendez-vous (prise,
              modification, annulation), l'envoi de rappels ou confirmations par SMS/e-mail, et le
              suivi de votre relation avec le salon. Elles ne sont jamais utilisées à des fins de
              prospection commerciale sans votre accord explicite, ni revendues à des tiers.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">4. Base légale</h2>
            <p className="mt-2">
              Le traitement de ces données repose sur l'exécution du service demandé (la prise de
              rendez-vous que vous initiez), conformément à l'article 6.1.b du RGPD.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">5. Destinataires des données</h2>
            <p className="mt-2">
              Vos données sont accessibles uniquement par le salon et par les prestataires techniques
              qui hébergent et font fonctionner ce site (hébergement web, base de données, envoi de
              SMS/e-mails). Ces prestataires n'utilisent vos données que pour ces besoins techniques et
              n'y accèdent pas à d'autres fins.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">6. Durée de conservation</h2>
            <p className="mt-2">
              Vos données sont conservées pendant la durée de votre relation avec le salon. Vous pouvez
              à tout moment demander leur suppression (voir ci-dessous).
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">7. Vos droits</h2>
            <p className="mt-2">
              Conformément au RGPD, vous disposez d'un droit d'accès, de rectification et d'effacement
              de vos données. Pour exercer ces droits, contactez directement le salon
              {phone ? ` par téléphone (${phone})` : ""} ou via le formulaire de contact du site.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold text-gray-900">8. Cookies</h2>
            <p className="mt-2">
              Ce site utilise uniquement des cookies techniques strictement nécessaires à son
              fonctionnement (maintien de votre connexion à l'espace client ou au back-office). Aucun
              cookie de mesure d'audience ou de publicité n'est utilisé.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
