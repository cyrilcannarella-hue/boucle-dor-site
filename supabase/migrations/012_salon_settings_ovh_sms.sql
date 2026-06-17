alter table public.salon_settings add column if not exists ovh_app_key text;
alter table public.salon_settings add column if not exists ovh_app_secret text;
alter table public.salon_settings add column if not exists ovh_consumer_key text;
alter table public.salon_settings add column if not exists ovh_service_name text;
