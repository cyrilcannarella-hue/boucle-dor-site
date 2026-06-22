import path from "path";

// Charge .env.local avant tout le reste (import à effet de bord, doit être
// importé en premier dans playwright.config.ts) — en CI, ces variables sont
// censées déjà être présentes dans l'environnement, donc on ignore l'absence du fichier.
try {
  process.loadEnvFile(path.resolve(__dirname, "../.env.local"));
} catch {
  // .env.local absent — on suppose que les variables sont déjà dans l'environnement.
}
