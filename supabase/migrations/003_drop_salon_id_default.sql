-- Le code Next.js renseigne désormais explicitement salon_id sur chaque
-- insertion (cf. lib/salon.ts + hooks/useSalon). Le DEFAULT temporaire
-- introduit par 001_multi_tenant.sql n'est plus nécessaire.

BEGIN;

ALTER TABLE salon_settings          ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE clients                 ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE categories              ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE services                ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE staff                   ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE staff_schedules         ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE exception_closures      ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE appointments            ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE questionnaire_questions ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE appointment_answers     ALTER COLUMN salon_id DROP DEFAULT;
ALTER TABLE appointment_logs        ALTER COLUMN salon_id DROP DEFAULT;

COMMIT;

-- ────────────────────────────────────────────────────────────
-- Limitation connue (RLS anon)
-- ────────────────────────────────────────────────────────────
-- Les policies RLS pour le rôle `anon` créées par 001_multi_tenant.sql
-- restent `USING (true)` : un client anonyme qui connaîtrait l'UUID
-- d'un autre salon pourrait théoriquement lire/écrire ses lignes via
-- l'API REST Supabase directement (hors de l'app Next.js).
-- L'isolation pour les requêtes anon est donc assurée au niveau
-- applicatif (filtre salon_id ajouté à chaque requête, cf. lib/salon.ts
-- et hooks/useSalon.ts), pas au niveau base.
-- Pour une isolation complète au niveau DB, il faudrait passer les
-- écritures/lectures publiques (réservation, espace-client) par des
-- Route Handlers utilisant la clé service_role + salon_id resolu
-- côté serveur, ce qui est hors scope de cette migration.
