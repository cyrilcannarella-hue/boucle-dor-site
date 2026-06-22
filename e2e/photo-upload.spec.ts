import { test, expect } from "@playwright/test";
import path from "path";

const FIXTURE = path.resolve(__dirname, "fixtures/test-photo.png");

// Même chemin de code que la galerie (handleUploadPhoto, même policy RLS
// storage), donc même classe de bug que celui corrigé le 22/06/2026.
test.describe("Apparence — upload de la photo hero", () => {
  test.afterEach(async ({ page }) => {
    const removeButton = page.getByRole("button", { name: "Supprimer" }).first();
    if (await removeButton.isVisible().catch(() => false)) {
      await removeButton.click();
      await expect(page.getByText("Photo hero supprimée")).toBeVisible();
    }
  });

  test("la photo hero s'enregistre sans erreur RLS", async ({ page }) => {
    await page.goto("/back-office/gestion");
    await page.getByRole("button", { name: "Apparence" }).click();
    await page.getByRole("button", { name: "Photos", exact: true }).click();

    // Carte hero rendue avant la carte "à propos" dans le DOM (cf. GestionClient.tsx).
    const heroFileInput = page.locator('input[type="file"]').first();
    await heroFileInput.setInputFiles(FIXTURE);

    await expect(page.getByText("Photo hero mise à jour")).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("new row violates row-level security policy")).toHaveCount(0);
  });
});
