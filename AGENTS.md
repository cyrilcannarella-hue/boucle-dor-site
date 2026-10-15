<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Supabase : GRANT explicites obligatoires sur toute nouvelle table

Depuis le 30 octobre 2026, Supabase n'accorde plus automatiquement l'accès Data API (PostgREST / supabase-js) aux nouvelles tables du schéma `public`. Toute migration qui fait un `CREATE TABLE` doit inclure ses `GRANT` dans la même migration, sinon la table renvoie `permission denied`.

Accorder uniquement aux rôles réellement utilisés, jamais `anon` par défaut (l'accès public passe par des Route Handlers en `service_role`, cf. migrations 021/028/035) :

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_table TO authenticated; -- si le back-office y accède (avec policy RLS is_salon_member)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ma_table TO service_role;  -- toujours
-- GRANT SELECT ON public.ma_table TO anon;  -- seulement si vraiment nécessaire, et avec une policy RLS scopée
```
