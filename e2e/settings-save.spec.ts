import { test, expect } from "@playwright/test";

// Garde-fou sur le chemin d'écriture "normal" (UPDATE seul, sans storage ni
// upsert) — pour repérer si un futur changement casse autre chose que l'upload.
test("le sous-titre du salon se sauvegarde et persiste après reload", async ({ page }) => {
  await page.goto("/back-office/gestion");
  await page.getByRole("button", { name: "Apparence" }).click();
  await page.getByRole("button", { name: "Nom du salon", exact: true }).click();

  const subtitleInput = page.getByLabel("Sous-titre");
  const originalValue = await subtitleInput.inputValue();
  const testValue = `Sous-titre test e2e ${Date.now()}`;

  try {
    await subtitleInput.fill(testValue);
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByText("Nom du salon enregistré")).toBeVisible();

    await page.reload();
    await page.getByRole("button", { name: "Apparence" }).click();
    await page.getByRole("button", { name: "Nom du salon", exact: true }).click();
    await expect(page.getByLabel("Sous-titre")).toHaveValue(testValue);
  } finally {
    // Restaure la valeur d'origine, qu'on ait réussi ou échoué plus haut.
    const input = page.getByLabel("Sous-titre");
    await input.fill(originalValue);
    await page.getByRole("button", { name: "Enregistrer", exact: true }).click();
    await expect(page.getByText("Nom du salon enregistré")).toBeVisible();
  }
});
