-- ============================================================
--  001_multi_tenant.sql
--  Passage du projet en multi-tenant (SaaS) :
--    - salons        : un salon = un tenant, résolu par sous-domaine
--                       {slug}.monsaas.fr
--    - salon_members : liaison auth.users <-> salons (back-office)
--    - subscriptions : facturation Stripe, 1 ligne par salon
--    - salon_id      : ajouté sur toutes les tables existantes
--    - RLS           : policies "authenticated" scoppées par salon
--    - backfill       : données existantes rattachées au salon
--                       "Boucle d'Or"
--
--  ⚠ Ne touche pas au code Next.js. À exécuter dans Supabase →
--    SQL Editor (ou via la CLI Supabase).
-- ============================================================

BEGIN;

-- ────────────────────────────────────────────────────────────
-- 1. CREATE TABLE salons
-- ────────────────────────────────────────────────────────────
CREATE TABLE salons (
  id            uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  slug          text NOT NULL UNIQUE,        -- {slug}.monsaas.fr
  custom_domain text UNIQUE,                 -- domaine perso optionnel
  name          text NOT NULL,
  status        text NOT NULL DEFAULT 'active', -- active | suspended | cancelled
  created_at    timestamp with time zone NOT NULL DEFAULT now(),
  updated_at    timestamp with time zone NOT NULL DEFAULT now()
);

-- Créé ici (avant les ALTER TABLE de la section 4) car les colonnes
-- salon_id ajoutées plus bas ont un DEFAULT qui référence cette ligne
-- via une contrainte FK validée immédiatement.
-- UUID fixe du salon Boucle d'Or — à réutiliser tel quel dans le
-- code Next.js (variable d'env NEXT_PUBLIC_SALON_ID ou équivalent).
INSERT INTO salons (id, slug, name, status)
VALUES ('a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10', 'boucle-dor', 'Boucle d''Or', 'active');

-- ────────────────────────────────────────────────────────────
-- 2. CREATE TABLE salon_members
-- ────────────────────────────────────────────────────────────
CREATE TABLE salon_members (
  id         uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id   uuid NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL DEFAULT 'owner',  -- owner | admin | staff
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (salon_id, user_id)
);

-- ────────────────────────────────────────────────────────────
-- 3. CREATE TABLE subscriptions
-- ────────────────────────────────────────────────────────────
CREATE TABLE subscriptions (
  id                     uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id               uuid NOT NULL UNIQUE REFERENCES salons(id) ON DELETE CASCADE,
  stripe_customer_id     text,
  stripe_subscription_id text,
  plan                   text NOT NULL DEFAULT 'trial',     -- trial | starter | pro
  status                 text NOT NULL DEFAULT 'trialing',  -- trialing | active | past_due | canceled
  current_period_end     timestamp with time zone,
  created_at             timestamp with time zone NOT NULL DEFAULT now(),
  updated_at             timestamp with time zone NOT NULL DEFAULT now()
);


-- ────────────────────────────────────────────────────────────
-- 4. ALTER TABLE — ajout de salon_id sur les tables existantes
-- ────────────────────────────────────────────────────────────
-- DEFAULT temporaire = salon Boucle d'Or (cf. section 7). Tant que
-- le code Next.js ne fournit pas explicitement salon_id à l'INSERT,
-- les nouvelles lignes seront automatiquement rattachées à ce salon.
-- À retirer (DROP DEFAULT) une fois le code multi-tenant prêt.
ALTER TABLE salon_settings          ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE clients                 ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE categories              ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE services                ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE staff                   ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE staff_schedules         ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE exception_closures      ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE appointments            ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE questionnaire_questions ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE appointment_answers     ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
ALTER TABLE appointment_logs        ADD COLUMN salon_id uuid REFERENCES salons(id) ON DELETE CASCADE DEFAULT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';

-- Index pour les filtres par salon (toutes les requêtes du front
-- vont systématiquement filtrer sur salon_id)
CREATE INDEX idx_clients_salon_id                 ON clients (salon_id);
CREATE INDEX idx_categories_salon_id              ON categories (salon_id);
CREATE INDEX idx_services_salon_id                ON services (salon_id);
CREATE INDEX idx_staff_salon_id                   ON staff (salon_id);
CREATE INDEX idx_staff_schedules_salon_id         ON staff_schedules (salon_id);
CREATE INDEX idx_exception_closures_salon_id      ON exception_closures (salon_id);
CREATE INDEX idx_appointments_salon_id            ON appointments (salon_id);
CREATE INDEX idx_questionnaire_questions_salon_id ON questionnaire_questions (salon_id);
CREATE INDEX idx_appointment_answers_salon_id     ON appointment_answers (salon_id);
CREATE INDEX idx_appointment_logs_salon_id        ON appointment_logs (salon_id);


-- ────────────────────────────────────────────────────────────
-- 5. RLS — fonction helper + policies
-- ────────────────────────────────────────────────────────────

-- Fonction SECURITY DEFINER : évite la récursion RLS sur
-- salon_members quand on l'appelle depuis les policies des
-- autres tables.
CREATE OR REPLACE FUNCTION public.is_salon_member(p_salon_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM salon_members
    WHERE salon_id = p_salon_id AND user_id = auth.uid()
  );
$$;

ALTER TABLE salons        ENABLE ROW LEVEL SECURITY;
ALTER TABLE salon_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- salons : un membre voit uniquement son/ses salon(s)
CREATE POLICY salons_member_read ON salons FOR SELECT
  TO authenticated
  USING (public.is_salon_member(id));

CREATE POLICY salons_member_write ON salons FOR UPDATE
  TO authenticated
  USING (public.is_salon_member(id))
  WITH CHECK (public.is_salon_member(id));

-- salon_members : un user voit ses propres liaisons
CREATE POLICY salon_members_self_read ON salon_members FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- subscriptions : lecture réservée aux membres du salon,
-- écriture réservée au service_role (webhooks Stripe)
CREATE POLICY subscriptions_member_read ON subscriptions FOR SELECT
  TO authenticated
  USING (public.is_salon_member(salon_id));


-- ────────────────────────────────────────────────────────────
-- 5bis. RLS — mise à jour des policies "authenticated" des
--        tables existantes : scope par salon via is_salon_member()
-- ────────────────────────────────────────────────────────────

-- salon_settings
DROP POLICY IF EXISTS salon_settings_authenticated_write ON salon_settings;
DROP POLICY IF EXISTS write_authenticated ON salon_settings;
CREATE POLICY salon_settings_authenticated_write ON salon_settings FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- categories
DROP POLICY IF EXISTS categories_authenticated_write ON categories;
DROP POLICY IF EXISTS write_authenticated ON categories;
CREATE POLICY categories_authenticated_write ON categories FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- services
DROP POLICY IF EXISTS services_authenticated_write ON services;
DROP POLICY IF EXISTS write_authenticated ON services;
CREATE POLICY services_authenticated_write ON services FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- staff
DROP POLICY IF EXISTS staff_authenticated_write ON staff;
DROP POLICY IF EXISTS write_authenticated ON staff;
CREATE POLICY staff_authenticated_write ON staff FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- staff_schedules
DROP POLICY IF EXISTS staff_schedules_authenticated_write ON staff_schedules;
DROP POLICY IF EXISTS write_authenticated ON staff_schedules;
CREATE POLICY staff_schedules_authenticated_write ON staff_schedules FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- exception_closures
DROP POLICY IF EXISTS exception_closures_authenticated_write ON exception_closures;
DROP POLICY IF EXISTS write_authenticated ON exception_closures;
CREATE POLICY exception_closures_authenticated_write ON exception_closures FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- questionnaire_questions
DROP POLICY IF EXISTS questionnaire_authenticated_write ON questionnaire_questions;
DROP POLICY IF EXISTS write_authenticated ON questionnaire_questions;
CREATE POLICY questionnaire_authenticated_write ON questionnaire_questions FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- clients (Cas B : anon garde insert/select/update USING(true), inchangé)
DROP POLICY IF EXISTS clients_authenticated_only ON clients;
CREATE POLICY clients_authenticated_only ON clients FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- appointments (Cas B : anon garde insert/select/update USING(true), inchangé)
DROP POLICY IF EXISTS appointments_authenticated_only ON appointments;
CREATE POLICY appointments_authenticated_only ON appointments FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- appointment_answers
DROP POLICY IF EXISTS answers_authenticated_only ON appointment_answers;
CREATE POLICY answers_authenticated_only ON appointment_answers FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- appointment_logs
DROP POLICY IF EXISTS appointment_logs_authenticated_only ON appointment_logs;
CREATE POLICY appointment_logs_authenticated_only ON appointment_logs FOR ALL
  TO authenticated
  USING (public.is_salon_member(salon_id))
  WITH CHECK (public.is_salon_member(salon_id));

-- ⚠ TODO sécurité (à traiter avec le code Next.js, hors scope ici) :
-- Les policies "anon" (select_public / clients_public_* /
-- appointments_public_* / answers_public_insert) restent en
-- USING(true) / WITH CHECK(true) : un client anon qui interroge
-- directement l'API REST sans filtrer sur salon_id peut lire/écrire
-- across tenants. À corriger en faisant passer les écritures/lectures
-- sensibles (clients, appointments, appointment_answers) par des
-- Route Handlers Next.js avec service_role + salon_id résolu côté
-- serveur (sous-domaine), au lieu d'un accès direct anon.


-- ────────────────────────────────────────────────────────────
-- 6. GRANTs — nouvelles tables (Supabase ne grant plus
--    automatiquement depuis le 30 mai 2026)
-- ────────────────────────────────────────────────────────────
GRANT SELECT                         ON salons        TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON salons        TO authenticated;
GRANT ALL                            ON salons        TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON salon_members TO authenticated;
GRANT ALL                            ON salon_members TO service_role;

GRANT SELECT                         ON subscriptions TO authenticated;
GRANT ALL                            ON subscriptions TO service_role;


-- ────────────────────────────────────────────────────────────
-- 7. Backfill — rattachement des données existantes au salon
--    "Boucle d'Or"
-- ────────────────────────────────────────────────────────────

INSERT INTO subscriptions (salon_id, plan, status)
VALUES ('a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10', 'pro', 'active');

UPDATE salon_settings          SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE clients                 SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE categories              SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE services                SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE staff                   SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE staff_schedules         SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE exception_closures       SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE appointments             SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE questionnaire_questions  SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE appointment_answers      SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';
UPDATE appointment_logs         SET salon_id = 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10';

-- Rattache le compte admin existant (cyril.cannarella@gmail.com) au
-- salon Boucle d'Or en tant que owner.
INSERT INTO salon_members (salon_id, user_id, role)
SELECT 'a1f9c2e0-6b3d-4e8a-9f12-3d7c5b8a0e10', id, 'owner'
FROM auth.users
WHERE email = 'cyril.cannarella@gmail.com';


-- ────────────────────────────────────────────────────────────
-- 8. Contraintes finales — NOT NULL + UNIQUE une fois le
--    backfill effectué
-- ────────────────────────────────────────────────────────────
ALTER TABLE salon_settings          ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE salon_settings          ADD CONSTRAINT salon_settings_salon_id_key UNIQUE (salon_id);
ALTER TABLE clients                 ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE categories              ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE services                ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE staff                   ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE staff_schedules         ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE exception_closures      ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE appointments            ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE questionnaire_questions ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE appointment_answers     ALTER COLUMN salon_id SET NOT NULL;
ALTER TABLE appointment_logs        ALTER COLUMN salon_id SET NOT NULL;

COMMIT;
