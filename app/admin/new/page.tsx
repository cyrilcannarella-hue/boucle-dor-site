import Link from "next/link";
import { createSalonAction } from "./actions";

export default async function NewSalonPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string; slug?: string; email?: string; password?: string }>;
}) {
  const { error, success, slug: createdSlug, email: createdEmail, password: createdPassword } = await searchParams;

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <div className="mx-auto max-w-md">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Nouveau salon</h1>
          <Link
            href="/admin"
            className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
          >
            Retour
          </Link>
        </div>

        {success && createdEmail && createdPassword && (
          <div className="mb-6 rounded-md border border-emerald-800 bg-emerald-950 px-4 py-3 text-sm text-emerald-300">
            <p className="mb-2 font-medium">
              Salon créé ({createdSlug}.monsaas.fr) — communique ces identifiants au propriétaire :
            </p>
            <p>
              Email : <span className="font-mono">{createdEmail}</span>
            </p>
            <p>
              Mot de passe temporaire : <span className="font-mono">{createdPassword}</span>
            </p>
            <p className="mt-2 text-xs text-emerald-400">
              À usage unique — invite le propriétaire à le changer dès sa première connexion au back-office.
            </p>
          </div>
        )}

        <form
          action={createSalonAction}
          className="rounded-xl border border-neutral-800 bg-neutral-900 p-6"
        >
          <label htmlFor="name" className="mb-2 block text-sm text-neutral-400">
            Nom du salon
          </label>
          <input
            id="name"
            name="name"
            type="text"
            required
            autoFocus
            placeholder="Salon de coiffure XYZ"
            className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />

          <label htmlFor="slug" className="mb-2 block text-sm text-neutral-400">
            Slug (sous-domaine)
          </label>
          <input
            id="slug"
            name="slug"
            type="text"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            placeholder="salon-xyz"
            className="mb-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />
          <p className="mb-4 text-xs text-neutral-500">
            Accessible sur {"{slug}"}.monsaas.fr — lettres minuscules, chiffres et tirets uniquement.
          </p>

          <label htmlFor="plan" className="mb-2 block text-sm text-neutral-400">
            Plan
          </label>
          <select
            id="plan"
            name="plan"
            defaultValue="trial"
            className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          >
            <option value="trial">Essai</option>
            <option value="starter">Starter</option>
            <option value="pro">Pro</option>
          </select>

          <label htmlFor="ownerEmail" className="mb-2 block text-sm text-neutral-400">
            Email du propriétaire
          </label>
          <input
            id="ownerEmail"
            name="ownerEmail"
            type="email"
            required
            placeholder="proprietaire@exemple.fr"
            className="mb-1 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
          />
          <p className="mb-6 text-xs text-neutral-500">
            Un compte back-office est créé pour cet email, avec un mot de passe temporaire généré automatiquement.
          </p>

          {error && (
            <p className="mb-4 text-sm text-red-400">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-900 transition hover:bg-neutral-300"
          >
            Créer le salon
          </button>
        </form>
      </div>
    </main>
  );
}
