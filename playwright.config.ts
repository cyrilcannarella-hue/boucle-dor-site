import "./e2e/load-env";
import { defineConfig } from "@playwright/test";
import { BASE_URL } from "./e2e/env";

export default defineConfig({
  testDir: "./e2e",
  // Les tests partagent les données du même salon (salon-test) : pas de
  // parallélisation pour éviter qu'un test écrase l'état lu/modifié par un autre.
  workers: 1,
  globalSetup: "./e2e/global-setup.ts",
  reporter: "list",
  use: {
    baseURL: BASE_URL,
    storageState: "./e2e/.auth/salon-test.json",
    trace: "retain-on-failure",
  },
});
