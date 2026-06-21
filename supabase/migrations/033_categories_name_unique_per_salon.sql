-- Même classe de bug que clients.phone (020_clients_phone_unique_per_salon.sql) :
-- categories_name_unique_idx portait sur lower(name) seul, globalement sur toute
-- la table multi-tenant — un nom de catégorie déjà pris par UN salon (ex: "Coupe",
-- "Couleur", "Soins" — des noms évidents que presque tous les salons choisiraient)
-- bloquait silencieusement sa création chez TOUS les autres salons.
-- Découvert en peuplant salon-test avec des catégories de démonstration.
BEGIN;

DROP INDEX IF EXISTS categories_name_unique_idx;
CREATE UNIQUE INDEX categories_name_unique_idx ON public.categories (salon_id, lower(name));

COMMIT;
