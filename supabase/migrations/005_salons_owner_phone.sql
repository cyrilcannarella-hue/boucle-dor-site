-- Ajoute un numéro de téléphone du propriétaire, affiché dans le dashboard
-- admin pour pouvoir le contacter en cas de souci de paiement.
ALTER TABLE salons ADD COLUMN owner_phone text;
