import { test, expect } from "@playwright/test";
import path from "path";

const FIXTURE = path.resolve(__dirname, "fixtures/test-photo.png");

// Régression directe du bug du 22/06/2026 : upsert:true sur l'upload faisait
// échouer la policy RLS d'UPDATE même pour un chemin neuf, jamais en conflit.
test.describe("Galerie — upload d'une photo", () => {
  test.afterEach(async ({ page }) => {
    // Nettoyage : on retire la photo qu'on vient d'ajouter, quoi qu'il soit
    // arrivé pendant le test, pour ne rien laisser sur salon-test.
    const removeButton = page.getByRole("button", { name: "Supprimer la photo" }).first();
    if (await removeButton.isVisible().catch(() => false)) {
      await removeButton.click();
      await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
      await expect(page.getByText("Galerie enregistrée")).toBeVisible();
    }
  });

  test("une photo uploadée dans un slot vide s'affiche sans erreur RLS", async ({ page }) => {
    await page.goto("/back-office/gestion");
    await page.getByRole("button", { name: "Galerie" }).click();

    const emptySlotInput = page.locator("label").filter({ hasText: "Choisir une photo" }).first().locator('input[type="file"]');
    await emptySlotInput.setInputFiles(FIXTURE);

    // L'upload bascule le slot de "Choisir une photo" vers une <img> avec l'URL du storage.
    const uploadedImg = page.locator('img[src*="site-images"]').first();
    await expect(uploadedImg).toBeVisible({ timeout: 15_000 });

    // Le bug corrigé aujourd'hui produisait précisément ce message.
    await expect(page.getByText("new row violates row-level security policy")).toHaveCount(0);

    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByText("Galerie enregistrée")).toBeVisible();
  });
});
