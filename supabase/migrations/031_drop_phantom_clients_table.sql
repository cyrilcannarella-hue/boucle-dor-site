-- Table fantôme "Clients" (majuscule), distincte de "clients" — RLS activée
-- sans aucune policy (donc déjà inaccessible à tout le monde sauf service_role),
-- 0 ligne, aucune référence dans le code. Nettoyage cosmétique, signalé par
-- l'audit sécurité du 2026-06-22 (advisor "rls_enabled_no_policy").
DROP TABLE IF EXISTS public."Clients";
