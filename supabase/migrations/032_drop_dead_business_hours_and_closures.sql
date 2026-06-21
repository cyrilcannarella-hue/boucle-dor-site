-- Tables mortes, remplacées par exception_closures / salon_settings (horaires
-- d'ouverture) lors du passage multi-tenant. Plus aucun .from("business_hours"/
-- "closures") dans le code (confirmé par grep), aucune contrainte FK entrante.
-- Leurs policies d'écriture non scopées par salon avaient déjà été supprimées
-- lors de l'audit sécurité du 2026-06-22 (028_fix_cross_tenant_and_pii_leak.sql).
DROP TABLE IF EXISTS public.business_hours;
DROP TABLE IF EXISTS public.closures;
