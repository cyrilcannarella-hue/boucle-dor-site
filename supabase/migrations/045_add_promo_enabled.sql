-- Bascule explicite pour afficher/masquer le bandeau promotionnel sur la
-- page d'accueil, indépendamment du texte saisi (même pattern que
-- gift_card_enabled, voir 043_add_gift_card.sql).
alter table public.salon_settings
  add column if not exists promo_enabled boolean not null default false;

-- Avant cette colonne, le bandeau s'affichait dès que promo_text était non
-- vide (aucune bascule séparée) : sans ce backfill, tous les salons ayant
-- déjà un texte de bandeau verraient leur bandeau disparaître silencieusement
-- au déploiement.
update public.salon_settings
set promo_enabled = true
where promo_text is not null and trim(promo_text) <> '';
