import Link from "next/link";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";
import { logoutAction } from "./login/actions";

type Subscription = {
  plan: string;
  status: string;
  current_period_end: string | null;
  stripe_customer_id: string | null;
};

type SalonRow = {
  id: string;
  slug: string;
  name: string;
  status: string;
  subscriptions: Subscription | null;
};

const PLAN_LABELS: Record<string, string> = {
  trial: "Essai",
  starter: "Starter",
  pro: "Pro",
};

const PLAN_MRR_CENTS: Record<string, number> = {
  trial: 0,
  starter: 2900,
  pro: 7900,
};

const STATUS_LABELS: Record<string, string> = {
  active: "Actif",
  suspended: "Suspendu",
  cancelled: "Annulé",
};

const SUBSCRIPTION_STATUS_LABELS: Record<string, string> = {
  trialing: "Essai",
  active: "Actif",
  past_due: "Paiement en retard",
  canceled: "Annulé",
};

function formatEuros(cents: number): string {
  return (cents / 100).toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
  });
}

function formatDate(date: string | null): string {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default async function AdminDashboardPage() {
  const supabase = createAdminSupabaseClient();

  const { data, error } = await supabase
    .from("salons")
    .select("id, slug, name, status, subscriptions(plan, status, current_period_end, stripe_customer_id)")
    .order("created_at", { ascending: true });

  const salons = (data ?? []) as unknown as SalonRow[];

  const now = Date.now();
  let activeSalons = 0;
  let mrrCents = 0;
  let pastDueCount = 0;
  let nextRenewal: string | null = null;

  for (const salon of salons) {
    const subscription = salon.subscriptions ?? undefined;

    if (salon.status === "active") activeSalons += 1;

    if (subscription?.status === "active") {
      mrrCents += PLAN_MRR_CENTS[subscription.plan] ?? 0;

      if (subscription.current_period_end && new Date(subscription.current_period_end).getTime() > now) {
        if (!nextRenewal || subscription.current_period_end < nextRenewal) {
          nextRenewal = subscription.current_period_end;
        }
      }
    }

    if (subscription?.status === "past_due") pastDueCount += 1;
  }

  const kpis = [
    { label: "Salons actifs", value: String(activeSalons) },
    { label: "MRR total", value: formatEuros(mrrCents) },
    { label: "Paiements en retard", value: String(pastDueCount) },
    { label: "Prochain renouvellement", value: formatDate(nextRenewal) },
  ];

  return (
    <main className="min-h-screen bg-neutral-950 px-6 py-10 text-neutral-100">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard admin</h1>
          <div className="flex items-center gap-3">
            <Link
              href="/admin/new"
              className="rounded-md bg-neutral-100 px-3 py-1.5 text-sm font-medium text-neutral-900 transition hover:bg-neutral-300"
            >
              Nouveau salon
            </Link>
            <form action={logoutAction}>
              <button
                type="submit"
                className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-500 hover:text-neutral-100"
              >
                Se déconnecter
              </button>
            </form>
          </div>
        </div>

        {error && (
          <p className="mb-6 rounded-md border border-red-800 bg-red-950 px-4 py-3 text-sm text-red-300">
            Erreur lors du chargement des salons : {error.message}
          </p>
        )}

        <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {kpis.map((kpi) => (
            <div
              key={kpi.label}
              className="rounded-xl border border-neutral-800 bg-neutral-900 p-5"
            >
              <p className="text-sm text-neutral-400">{kpi.label}</p>
              <p className="mt-2 text-2xl font-semibold">{kpi.value}</p>
            </div>
          ))}
        </div>

        <div className="overflow-x-auto rounded-xl border border-neutral-800">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900 text-neutral-400">
              <tr>
                <th className="px-4 py-3 font-medium">Salon</th>
                <th className="px-4 py-3 font-medium">Statut</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">MRR</th>
                <th className="px-4 py-3 font-medium">Prochain paiement</th>
                <th className="px-4 py-3 font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800">
              {salons.map((salon) => {
                const subscription = salon.subscriptions ?? undefined;
                const plan = subscription?.plan ?? "trial";
                const subStatus = subscription?.status ?? "trialing";
                const mrr = subStatus === "active" ? PLAN_MRR_CENTS[plan] ?? 0 : 0;

                return (
                  <tr key={salon.id} className="hover:bg-neutral-900/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{salon.name}</div>
                      <div className="text-xs text-neutral-500">{salon.slug}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={
                          salon.status === "active"
                            ? "rounded-full bg-emerald-950 px-2 py-0.5 text-xs text-emerald-400"
                            : "rounded-full bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400"
                        }
                      >
                        {STATUS_LABELS[salon.status] ?? salon.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>{PLAN_LABELS[plan] ?? plan}</div>
                      <div
                        className={
                          subStatus === "past_due"
                            ? "text-xs text-red-400"
                            : "text-xs text-neutral-500"
                        }
                      >
                        {SUBSCRIPTION_STATUS_LABELS[subStatus] ?? subStatus}
                      </div>
                    </td>
                    <td className="px-4 py-3">{formatEuros(mrr)}</td>
                    <td className="px-4 py-3">{formatDate(subscription?.current_period_end ?? null)}</td>
                    <td className="px-4 py-3">
                      {subscription?.stripe_customer_id ? (
                        <a
                          href={`https://dashboard.stripe.com/customers/${subscription.stripe_customer_id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-neutral-300 underline hover:text-neutral-100"
                        >
                          Voir sur Stripe
                        </a>
                      ) : (
                        <span className="text-neutral-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}

              {salons.length === 0 && !error && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-neutral-500">
                    Aucun salon pour le moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
