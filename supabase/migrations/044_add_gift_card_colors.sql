-- Couleurs dédiées à la section "Bon cadeau" (fond de carte, description, badge du lien).
alter table public.salon_settings
  add column if not exists color_giftcard_bg text,
  add column if not exists color_giftcard_text text,
  add column if not exists color_giftcard_accent text;
