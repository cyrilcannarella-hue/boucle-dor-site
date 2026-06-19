-- ============================================================
--  021_fix_anon_cross_tenant.sql
--
--  Ferme l'accès anon ouvert (non filtré par salon_id) sur les
--  tables contenant des données clients/rendez-vous, identifié
--  comme TODO dans 001_multi_tenant.sql (section 5bis) :
--  un visiteur anon interrogeant directement l'API REST pouvait
--  lire/écrire les clients et rendez-vous de N'IMPORTE QUEL salon.
--
--  Prérequis : les écritures/lectures publiques (réservation en
--  ligne, espace client) ont été migrées vers des Route Handlers
--  Next.js (app/api/reservation/*, app/api/espace-client/*,
--  app/api/public/*) qui utilisent le service_role et résolvent
--  salon_id côté serveur depuis le sous-domaine. Plus aucun appel
--  anon direct sur ces 3 tables ne subsiste côté client.
-- ============================================================

BEGIN;

ALTER TABLE clients              ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments         ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_answers  ENABLE ROW LEVEL SECURITY;

-- clients
DROP POLICY IF EXISTS "Allow public insert" ON clients;
DROP POLICY IF EXISTS "Allow public select" ON clients;
DROP POLICY IF EXISTS "Allow public update" ON clients;

-- appointments
DROP POLICY IF EXISTS "Allow public insert" ON appointments;
DROP POLICY IF EXISTS "Allow public select" ON appointments;
DROP POLICY IF EXISTS "Allow public update" ON appointments;

-- appointment_answers (+ nettoyage de write_authenticated, oubliée lors
-- du passage en multi-tenant : seule table dont l'ancienne policy large
-- n'avait pas été supprimée par 001_multi_tenant.sql)
DROP POLICY IF EXISTS insert_anon ON appointment_answers;
DROP POLICY IF EXISTS select_public ON appointment_answers;
DROP POLICY IF EXISTS write_authenticated ON appointment_answers;

COMMIT;
