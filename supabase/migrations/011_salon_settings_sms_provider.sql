alter table public.salon_settings add column if not exists sms_provider text default 'brevo';
alter table public.salon_settings add column if not exists twilio_account_sid text;
alter table public.salon_settings add column if not exists twilio_auth_token text;
alter table public.salon_settings add column if not exists twilio_from_number text;
