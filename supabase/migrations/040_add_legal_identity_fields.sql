-- Champs d'identité légale nécessaires aux mentions légales (obligation LCEN,
-- distincte du RGPD) — vides par défaut, jamais de valeur fictive : chaque
-- salon doit les renseigner lui-même via le back-office.
alter table salon_settings
  add column if not exists siret text,
  add column if not exists legal_form text;
