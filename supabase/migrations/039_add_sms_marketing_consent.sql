-- Consentement explicite requis avant tout SMS de prospection (campagnes) —
-- distinct des SMS transactionnels (confirmation/rappel de rendez-vous), qui
-- reposent sur l'exécution du contrat et n'ont pas besoin de ce consentement.
alter table clients
  add column if not exists sms_marketing_consent boolean not null default false,
  add column if not exists sms_marketing_consent_at timestamptz;
