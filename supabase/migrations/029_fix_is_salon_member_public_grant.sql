-- Le REVOKE de 028 visait "anon" mais le droit d'exécution venait du
-- grant par défaut à PUBLIC (comportement standard Postgres à la création
-- d'une fonction) : anon en hérite via PUBLIC, pas via un grant qui lui
-- est propre. Il faut révoquer PUBLIC puis ré-accorder explicitement à
-- authenticated (qui en a besoin pour ses policies RLS).
--
-- Vérifié après coup (information_schema.routine_privileges) : seuls
-- postgres, authenticated et service_role gardent EXECUTE.
BEGIN;

REVOKE EXECUTE ON FUNCTION public.is_salon_member(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_salon_member(uuid) TO authenticated;

COMMIT;
