-- ================================================================
-- SNIPPET : sécurisation d'une nouvelle table — Boucle d'Or
-- ================================================================
-- À copier-coller juste après chaque CREATE TABLE.
-- Remplacer "ma_table" par le vrai nom, puis choisir le Cas A ou B.
--
-- ARCHITECTURE AUTH DU PROJET
-- ─────────────────────────────────────────────────────────────────
-- • anon         → clé publishable exposée dans le browser.
--                  Utilisée par TOUTES les pages (public + back-office).
--                  Les RLS sont le seul garde-fou côté base.
-- • authenticated → JWT Supabase Auth. Identifie un admin connecté
--                  (session créée dans login/page.tsx).
-- • service_role  → clé secrète, uniquement dans les Route Handlers
--                  Next.js (send-sms, cron/reminders). Bypass RLS natif.
--
-- DEUX PATTERNS DANS CE PROJET
-- ─────────────────────────────────────────────────────────────────
-- Cas A — Tables de référence   → lecture publique, écriture admin
--   salon_settings, categories, services, staff, staff_schedules,
--   questionnaire_questions, exception_closures
--
-- Cas B — Tables transactionnelles → écriture aussi depuis le front
--   clients, appointments, appointment_answers, appointment_logs
-- ================================================================


-- ┌──────────────────────────────────────────────────────────────┐
-- │  1. ACTIVER RLS                                              │
-- └──────────────────────────────────────────────────────────────┘

ALTER TABLE ma_table ENABLE ROW LEVEL SECURITY;


-- ┌──────────────────────────────────────────────────────────────┐
-- │  2. GRANTS AU NIVEAU TABLE                                   │
-- │     Décommenter UN seul bloc selon le cas.                   │
-- └──────────────────────────────────────────────────────────────┘

-- ── Cas A : table de référence ─────────────────────────────────
GRANT SELECT                             ON ma_table TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE     ON ma_table TO authenticated;
GRANT ALL                                ON ma_table TO service_role;

-- ── Cas B : table transactionnelle ─────────────────────────────
-- GRANT SELECT, INSERT, UPDATE             ON ma_table TO anon;
-- GRANT SELECT, INSERT, UPDATE, DELETE     ON ma_table TO authenticated;
-- GRANT ALL                                ON ma_table TO service_role;

-- ── Si la table a une séquence (SERIAL/BIGSERIAL) ──────────────
-- Pas nécessaire avec UUID (gen_random_uuid()), uniquement pour
-- les colonnes SERIAL / BIGSERIAL :
-- GRANT USAGE, SELECT ON SEQUENCE ma_table_id_seq TO anon, authenticated;


-- ┌──────────────────────────────────────────────────────────────┐
-- │  3. POLICIES RLS                                             │
-- │     Décommenter UN seul bloc selon le cas.                   │
-- └──────────────────────────────────────────────────────────────┘

-- ── Cas A : table de référence ─────────────────────────────────

-- Lecture publique (visiteurs non connectés + admins)
CREATE POLICY "select_public"
  ON ma_table FOR SELECT
  TO anon, authenticated
  USING (true);

-- Écriture réservée aux admins authentifiés (back-office)
CREATE POLICY "write_authenticated"
  ON ma_table FOR ALL
  TO authenticated
  USING (true)
  WITH CHECK (true);


-- ── Cas B : table transactionnelle ─────────────────────────────
-- (remplacer les deux policies ci-dessus par celles-ci)

-- Lecture publique
-- CREATE POLICY "select_public"
--   ON ma_table FOR SELECT
--   TO anon, authenticated
--   USING (true);

-- INSERT anon — visiteur non connecté peut créer une ligne
-- (ex : nouvelle réservation, nouvelle fiche client)
-- CREATE POLICY "insert_anon"
--   ON ma_table FOR INSERT
--   TO anon
--   WITH CHECK (true);

-- UPDATE anon — visiteur peut modifier ses propres lignes
-- ⚠ Restreindre USING si possible pour éviter qu'un anon ne
--   modifie les lignes des autres (voir exemples ci-dessous).
--
--   • appointments liés au client identifié par son téléphone :
--     USING (client_id IN (
--       SELECT id FROM clients WHERE phone = current_setting('request.jwt.claims', true)::json->>'phone'
--     ))
--
--   • lignes génériques sans FK client → laisser USING (true) le
--     temps de valider, puis affiner.
--
-- CREATE POLICY "update_anon"
--   ON ma_table FOR UPDATE
--   TO anon
--   USING (true)      -- ← affiner selon la table
--   WITH CHECK (true);

-- Droits complets pour les admins authentifiés (back-office)
-- CREATE POLICY "write_authenticated"
--   ON ma_table FOR ALL
--   TO authenticated
--   USING (true)
--   WITH CHECK (true);


-- ┌──────────────────────────────────────────────────────────────┐
-- │  4. VÉRIFICATION                                             │
-- └──────────────────────────────────────────────────────────────┘
-- Confirmer que RLS est actif et que les policies sont en place :
--
-- SELECT tablename, rowsecurity
--   FROM pg_tables
--   WHERE tablename = 'ma_table';
--
-- SELECT policyname, cmd, roles, qual, with_check
--   FROM pg_policies
--   WHERE tablename = 'ma_table';
