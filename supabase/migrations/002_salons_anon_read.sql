-- Permet au rôle anon de résoudre le salon courant (slug -> id) côté serveur,
-- avant authentification (réservation publique, pages publiques).
-- Colonnes exposées non sensibles (id, slug, name, status, custom_domain).
BEGIN;

CREATE POLICY salons_anon_read ON salons FOR SELECT
  TO anon
  USING (true);

COMMIT;
