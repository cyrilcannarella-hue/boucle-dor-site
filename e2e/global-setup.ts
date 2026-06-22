import "./load-env";
import fs from "fs";
import path from "path";
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { BASE_URL } from "./env";

const STORAGE_STATE_PATH = path.resolve(__dirname, ".auth/salon-test.json");

// Authentifie les tests comme propriétaire de "salon-test" sans mot de passe,
// en réutilisant le même mécanisme que le salon démo public
// (app/api/demo-access/route.ts) : un magic link généré côté service role.
export default async function globalSetup() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY sont requis pour les tests e2e (voir .env.local)."
    );
  }
  const admin = createClient(supabaseUrl, serviceRoleKey);

  const { data: salon, error: salonError } = await admin
    .from("salons")
    .select("id")
    .eq("slug", "salon-test")
    .maybeSingle();
  if (salonError || !salon) {
    throw new Error(`Salon "salon-test" introuvable : ${salonError?.message ?? "aucune ligne"}`);
  }

  const { data: member, error: memberError } = await admin
    .from("salon_members")
    .select("user_id")
    .eq("salon_id", salon.id)
    .eq("role", "owner")
    .limit(1)
    .maybeSingle();
  if (memberError || !member) {
    throw new Error(`Propriétaire de "salon-test" introuvable : ${memberError?.message ?? "aucune ligne"}`);
  }

  const { data: userData, error: userError } = await admin.auth.admin.getUserById(member.user_id);
  if (userError || !userData?.user?.email) {
    throw new Error(`Compte propriétaire introuvable : ${userError?.message ?? "pas d'email"}`);
  }

  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: userData.user.email,
    options: { redirectTo: `${BASE_URL}/auth/magic` },
  });
  if (linkError || !linkData?.properties?.action_link) {
    throw new Error(`Impossible de générer le lien magique : ${linkError?.message ?? "lien manquant"}`);
  }

  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto(linkData.properties.action_link);
  await page.waitForURL(`${BASE_URL}/back-office`, { timeout: 15_000 });

  fs.mkdirSync(path.dirname(STORAGE_STATE_PATH), { recursive: true });
  await page.context().storageState({ path: STORAGE_STATE_PATH });
  await browser.close();
}
