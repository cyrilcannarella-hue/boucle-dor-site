-- Fige le nom de la prestation sur chaque rendez-vous au moment de la réservation
-- (comme price_cents déjà) et rend le lien vers services optionnel, pour permettre
-- la suppression définitive d'une prestation sans casser l'historique des
-- rendez-vous passés qui la référencent encore.

ALTER TABLE appointments ADD COLUMN service_name text;

UPDATE appointments a
SET service_name = s.name
FROM services s
WHERE a.service_id = s.id AND a.service_name IS NULL;

ALTER TABLE appointments ALTER COLUMN service_name SET NOT NULL;

ALTER TABLE appointments ALTER COLUMN service_id DROP NOT NULL;

ALTER TABLE appointments DROP CONSTRAINT appointments_service_id_fkey;
ALTER TABLE appointments
  ADD CONSTRAINT appointments_service_id_fkey
  FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE SET NULL;
