-- ================================================================
-- GRANTS EXPLICITES — tables existantes Boucle d'Or
-- ================================================================
-- À exécuter UNE SEULE FOIS dans l'éditeur SQL Supabase.
-- Contexte : à partir du 30 mai 2026, Supabase ne fait plus de
-- GRANT automatique sur les nouvelles tables. Les tables existantes
-- gardent leur comportement actuel jusqu'au 30 octobre 2026.
-- Ce script les sécurise dès maintenant.
--
-- Cas A — référence   : anon = SELECT seulement
-- Cas B — transactionnel : anon = SELECT + INSERT + UPDATE
-- ================================================================


-- ┌──────────────────────────────────────────────────────────────┐
-- │  CAS A — Tables de référence (lecture seule pour anon)       │
-- └──────────────────────────────────────────────────────────────┘

GRANT SELECT                         ON salon_settings          TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON salon_settings          TO authenticated;
GRANT ALL                            ON salon_settings          TO service_role;

GRANT SELECT                         ON categories              TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON categories              TO authenticated;
GRANT ALL                            ON categories              TO service_role;

GRANT SELECT                         ON services                TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON services                TO authenticated;
GRANT ALL                            ON services                TO service_role;

GRANT SELECT                         ON staff                   TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff                   TO authenticated;
GRANT ALL                            ON staff                   TO service_role;

GRANT SELECT                         ON staff_schedules         TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON staff_schedules         TO authenticated;
GRANT ALL                            ON staff_schedules         TO service_role;

GRANT SELECT                         ON exception_closures      TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON exception_closures      TO authenticated;
GRANT ALL                            ON exception_closures      TO service_role;

GRANT SELECT                         ON questionnaire_questions TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON questionnaire_questions TO authenticated;
GRANT ALL                            ON questionnaire_questions TO service_role;


-- ┌──────────────────────────────────────────────────────────────┐
-- │  CAS B — Tables transactionnelles (écriture anon autorisée)  │
-- └──────────────────────────────────────────────────────────────┘
-- clients       : le visiteur crée/modifie sa fiche lors d'une réservation
-- appointments  : le visiteur crée et annule ses RDV
-- appointment_answers : le visiteur soumet ses réponses au questionnaire

GRANT SELECT, INSERT, UPDATE         ON clients                 TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON clients                 TO authenticated;
GRANT ALL                            ON clients                 TO service_role;

GRANT SELECT, INSERT, UPDATE         ON appointments            TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointments            TO authenticated;
GRANT ALL                            ON appointments            TO service_role;

GRANT SELECT, INSERT, UPDATE         ON appointment_answers     TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON appointment_answers     TO authenticated;
GRANT ALL                            ON appointment_answers     TO service_role;


-- ┌──────────────────────────────────────────────────────────────┐
-- │  VÉRIFICATION                                                │
-- └──────────────────────────────────────────────────────────────┘
-- Après exécution, contrôler que tout est en place :
--
-- SELECT grantee, table_name, privilege_type
--   FROM information_schema.role_table_grants
--   WHERE table_schema = 'public'
--     AND grantee IN ('anon', 'authenticated', 'service_role')
--   ORDER BY table_name, grantee, privilege_type;
