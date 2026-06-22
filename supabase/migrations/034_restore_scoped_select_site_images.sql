-- ============================================================
--  034_restore_scoped_select_site_images.sql
--
--  La migration 028 a supprimé "public_read_site_images" (listing
--  public du bucket, jamais utilisé par le code via .list()), en
--  supposant qu'aucune policy SELECT n'était nécessaire. Mais
--  storage.objects.remove() (utilisé par removeStorageFile() côté
--  admin pour nettoyer l'ancien fichier lors d'un remplacement) a
--  besoin de SELECT pour localiser la ligne à supprimer : sans
--  aucune policy SELECT, la suppression échoue silencieusement
--  (200 OK, tableau vide) pour tout le monde, sur tous les salons.
--
--  Confirmé par les tests e2e (Playwright) : fichiers de test
--  jamais nettoyés après le passage des specs sur salon-test.
--
--  Cette policy ne réintroduit pas la fuite d'origine : elle est
--  scopée à `authenticated` + appartenance au salon du dossier
--  (même condition que admin_upload/update/delete_site_images),
--  pas un accès public/anon.
-- ============================================================

BEGIN;

CREATE POLICY admin_select_site_images ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'site-images'
    AND public.is_salon_member(((storage.foldername(name))[1])::uuid)
  );

COMMIT;
