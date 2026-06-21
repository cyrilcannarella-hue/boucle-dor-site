-- ============================================================
--  028_fix_cross_tenant_and_pii_leak.sql
--
--  Corrige 3 failles trouvées lors d'un audit de sécurité :
--  1. salons_anon_read (002_salons_anon_read.sql) donnait accès
--     anon à TOUTES les colonnes, y compris des colonnes PII
--     ajoutées depuis (owner_phone, address, etc.) jamais
--     revues. Restreint aux colonnes réellement nécessaires à
--     la résolution publique du salon par sous-domaine.
--  2. Policies legacy pré-multi-tenant sur staff/staff_schedules
--     ("Modification authentifiée ..."), non scopées par salon_id,
--     coexistant avec la policy scopée récente (is_salon_member) —
--     Postgres additionne les policies permissives, donc l'ancienne
--     rendait la nouvelle inopérante. Permettait à tout utilisateur
--     authentifié de lire/écrire le staff de n'importe quel salon.
--  3. Même bug sur business_hours/closures (tables mortes, plus
--     référencées dans le code, remplacées par exception_closures).
--  + Durcissements mineurs (is_salon_member exposée en RPC anon,
--    search_path mutable, listing public inutile du bucket storage).
--
--  Appliqué en prod le 2026-06-22 via Supabase MCP (vérifié : fuite
--  PII fermée par test REST direct, lecture publique staff intacte).
-- ============================================================

BEGIN;

-- 1. Fuite PII critique : limiter les colonnes lisibles par anon sur salons
REVOKE SELECT ON public.salons FROM anon;
GRANT SELECT (id, slug, name, status, is_test, custom_domain) ON public.salons TO anon;

-- 2. Cross-tenant staff/staff_schedules : supprimer les policies legacy non scopées
DROP POLICY IF EXISTS "Modification authentifiée staff" ON staff;
DROP POLICY IF EXISTS "Modification authentifiée staff_schedules" ON staff_schedules;

-- 3. Tables mortes business_hours/closures : fermer l'accès écriture non scopé
DROP POLICY IF EXISTS business_hours_authenticated_write ON business_hours;
DROP POLICY IF EXISTS closures_authenticated_write ON closures;

-- 4. Retirer le listing public inutile du bucket site-images (app n'appelle jamais .list())
DROP POLICY IF EXISTS public_read_site_images ON storage.objects;

-- 5. Fermer l'accès RPC anon à is_salon_member (authenticated en a toujours besoin pour RLS)
REVOKE EXECUTE ON FUNCTION public.is_salon_member(uuid) FROM anon;

-- 6. Durcissement mineur : search_path figé
ALTER FUNCTION public.set_updated_at() SET search_path = public;

COMMIT;
