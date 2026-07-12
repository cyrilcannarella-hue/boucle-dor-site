-- Abonnements Web Push (navigateur/PWA) pour recevoir une notification
-- à chaque nouveau rendez-vous en ligne, sans dépendre d'un onglet ouvert.

CREATE TABLE push_subscriptions (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id    uuid        NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  endpoint    text        NOT NULL UNIQUE,
  p256dh      text        NOT NULL,
  auth        text        NOT NULL,
  created_at  timestamptz DEFAULT now()
);

CREATE INDEX idx_push_subscriptions_salon_id ON push_subscriptions (salon_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Lecture et écriture scopées au membre du salon (même pattern que les autres
-- tables d'administration). L'envoi côté serveur passe par le service role,
-- qui bypass RLS pour pouvoir nettoyer les abonnements expirés.
CREATE POLICY push_subscriptions_authenticated_write ON push_subscriptions
  FOR ALL TO authenticated
  USING  (is_salon_member(salon_id))
  WITH CHECK (is_salon_member(salon_id));
