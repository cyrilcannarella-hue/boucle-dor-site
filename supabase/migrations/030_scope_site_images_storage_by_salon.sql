-- ============================================================
--  030_scope_site_images_storage_by_salon.sql
--
--  Suite de l'audit sécurité : le bucket storage "site-images" est
--  partagé entre tous les salons mais les policies upload/update
--  ne vérifiaient que bucket_id, jamais l'appartenance au salon —
--  n'importe quel utilisateur authentifié pouvait écraser/uploader
--  des fichiers dans n'importe quel "dossier" du bucket.
--
--  Prérequis (fait manuellement avant cette migration, hors SQL) :
--  les 10 fichiers existants ont été déplacés de "type-timestamp.ext"
--  vers "{salon_id}/type-timestamp.ext" via l'API Storage (move), et
--  les colonnes salon_settings.*_image_url mises à jour en conséquence.
--  Nouveaux uploads : le code (gestion/page.tsx) préfixe désormais
--  le path par `${salonId}/`.
--
--  Appliqué en prod le 2026-06-22 via Supabase MCP.
-- ============================================================

BEGIN;

DROP POLICY IF EXISTS admin_upload_site_images ON storage.objects;
DROP POLICY IF EXISTS admin_update_site_images ON storage.objects;

CREATE POLICY admin_upload_site_images ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'site-images'
    AND public.is_salon_member(((storage.foldername(name))[1])::uuid)
  );

CREATE POLICY admin_update_site_images ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'site-images'
    AND public.is_salon_member(((storage.foldername(name))[1])::uuid)
  )
  WITH CHECK (
    bucket_id = 'site-images'
    AND public.is_salon_member(((storage.foldername(name))[1])::uuid)
  );

-- Aucune policy DELETE n'existait avant (donc removeStorageFile() était
-- déjà bloquée par RLS pour tout le monde sauf service_role) — ajoutée
-- ici, scopée de la même façon, pour que le nettoyage de l'ancien
-- fichier lors d'un remplacement fonctionne enfin pour son propriétaire.
CREATE POLICY admin_delete_site_images ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'site-images'
    AND public.is_salon_member(((storage.foldername(name))[1])::uuid)
  );

COMMIT;
