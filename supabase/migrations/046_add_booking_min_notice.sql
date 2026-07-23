-- Délai minimum avant la prise de rendez-vous en ligne, réglable par salon
-- depuis le nouvel onglet "Réservation" du back-office : aucun délai, jour
-- même bloqué, ou jour même + lendemain bloqués.
alter table public.salon_settings
  add column if not exists booking_min_notice text not null default 'none'
  check (booking_min_notice in ('none', 'same_day', 'next_day'));
