import webpush from "web-push";
import { createAdminSupabaseClient } from "@/lib/supabase/admin-client";

type PushPayload = {
  title: string;
  body: string;
  url?: string;
  icon?: string | null;
};

let vapidConfigured = false;
function ensureVapid() {
  if (vapidConfigured) return true;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT;
  if (!publicKey || !privateKey || !subject) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  vapidConfigured = true;
  return true;
}

// Notifie tous les appareils abonnés d'un salon (navigateur desktop, PWA
// installée mobile). Best-effort : ne doit jamais faire échouer l'appelant
// (ex: une réservation) si l'envoi push échoue.
export async function sendPushToSalon(salonId: string, payload: PushPayload) {
  if (!ensureVapid()) return;

  const supabase = createAdminSupabaseClient();
  const { data: subscriptions } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("salon_id", salonId);

  if (!subscriptions || subscriptions.length === 0) return;

  const body = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/back-office",
    icon: payload.icon || undefined,
  });

  const expiredIds: string[] = [];

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          body
        );
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expiredIds.push(sub.id as string);
        }
      }
    })
  );

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }
}
