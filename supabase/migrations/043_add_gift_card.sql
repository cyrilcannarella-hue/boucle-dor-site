-- Section "Bon cadeau" optionnelle sur la page d'accueil, juste après les prestations.
alter table public.salon_settings
  add column if not exists gift_card_enabled boolean not null default false,
  add column if not exists gift_card_description text,
  add column if not exists gift_card_link text;
