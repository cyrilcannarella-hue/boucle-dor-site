-- ============================================================
--  035_drop_public_read_booking_tables.sql
--
--  6 tables avaient une policy SELECT ouverte à anon/public avec
--  qual = true (aucun filtre par salon) : services, staff,
--  staff_schedules, exception_closures, categories,
--  questionnaire_questions. N'importe qui pouvait, par un appel
--  direct à l'API REST Supabase, lister ces données pour TOUS les
--  salons de la plateforme, pas seulement celui du site visité.
--
--  La page de réservation publique et l'espace client lisaient ces
--  tables directement depuis le navigateur (clé anon) — remplacé par
--  de nouvelles routes serveur scopées au salon courant
--  (app/api/public/booking-options/route.ts,
--  app/api/public/busy-appointments/route.ts étendue) avant cette
--  migration, donc ces policies ne sont plus nécessaires.
--
--  Les policies d'écriture authentifiée (*_authenticated_write),
--  scopées par is_salon_member, ne sont pas touchées.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS services_public_read ON services;
DROP POLICY IF EXISTS "Lecture publique staff" ON staff;
DROP POLICY IF EXISTS "Lecture publique staff_schedules" ON staff_schedules;
DROP POLICY IF EXISTS exception_closures_public_read ON exception_closures;
DROP POLICY IF EXISTS categories_public_read ON categories;
DROP POLICY IF EXISTS select_public ON questionnaire_questions;

COMMIT;
