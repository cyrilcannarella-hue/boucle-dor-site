-- L'unicité du téléphone client était globale (clients_phone_unique_idx sur phone seul),
-- ce qui empêche deux salons différents d'avoir chacun un client avec le même numéro
-- (import Planity en échec dès qu'un numéro existe déjà chez un AUTRE salon).
-- On la rend unique par salon (salon_id, phone) à la place.
ALTER TABLE clients DROP CONSTRAINT IF EXISTS clients_phone_unique_idx;
DROP INDEX IF EXISTS clients_phone_unique_idx;
CREATE UNIQUE INDEX clients_phone_unique_idx ON clients (salon_id, phone);
