-- La migration 001_multi_tenant.sql a créé salon_members et scopé les
-- policies "authenticated" via is_salon_member(salon_id), mais n'a inséré
-- aucune ligne dans salon_members pour le(s) compte(s) admin existant(s).
-- Résultat : is_salon_member() renvoie false pour tout le monde, et RLS
-- bloque silencieusement (résultat vide) toutes les requêtes authenticated
-- sur appointments, clients, etc. → plus aucun rdv visible dans le back-office.
--
-- Avant ce projet, tous les comptes auth.users existants appartiennent à
-- Boucle d'Or : on les rattache donc tous au salon Boucle d'Or en tant
-- qu'"owner".

INSERT INTO salon_members (salon_id, user_id, role)
SELECT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10', id, 'owner'
FROM auth.users
ON CONFLICT (salon_id, user_id) DO NOTHING;
