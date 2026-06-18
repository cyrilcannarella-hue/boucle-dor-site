alter table public.salon_settings add column if not exists gallery_enabled boolean default false;
alter table public.salon_settings add column if not exists site_gallery jsonb;
