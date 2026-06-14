-- Salon en gratuité : exclu du MRR et des paiements en retard.
ALTER TABLE salons ADD COLUMN is_free boolean NOT NULL DEFAULT false;
