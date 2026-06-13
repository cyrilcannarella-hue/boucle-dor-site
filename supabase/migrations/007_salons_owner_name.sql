-- Ajoute le nom et prénom du propriétaire, affichés dans le dashboard
-- admin pour identifier le contact du salon.
ALTER TABLE salons ADD COLUMN owner_first_name text;
ALTER TABLE salons ADD COLUMN owner_last_name text;
