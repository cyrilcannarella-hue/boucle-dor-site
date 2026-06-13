-- Permet de définir, par salon, l'URL du site public et l'URL du
-- back-office (utiles si un salon est déployé sur son propre domaine).
-- Si NULL, le dashboard admin retombe sur les URLs par défaut
-- (SALON_APP_URL).
ALTER TABLE salons ADD COLUMN site_url text;
ALTER TABLE salons ADD COLUMN backoffice_url text;
