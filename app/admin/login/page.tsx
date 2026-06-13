import { loginAction } from "./actions";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-950 px-4">
      <form
        action={loginAction}
        className="w-full max-w-sm rounded-xl border border-neutral-800 bg-neutral-900 p-8 shadow-xl"
      >
        <h1 className="mb-6 text-xl font-semibold text-neutral-100">
          Admin SaaS
        </h1>

        <label htmlFor="password" className="mb-2 block text-sm text-neutral-400">
          Mot de passe
        </label>
        <input
          id="password"
          name="password"
          type="password"
          required
          autoFocus
          className="mb-4 w-full rounded-md border border-neutral-700 bg-neutral-800 px-3 py-2 text-neutral-100 outline-none focus:border-neutral-500"
        />

        {error && (
          <p className="mb-4 text-sm text-red-400">Mot de passe incorrect.</p>
        )}

        <button
          type="submit"
          className="w-full rounded-md bg-neutral-100 px-3 py-2 font-medium text-neutral-900 transition hover:bg-neutral-300"
        >
          Se connecter
        </button>
      </form>
    </main>
  );
}
