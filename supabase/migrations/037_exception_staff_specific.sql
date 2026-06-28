-- Fermetures et ouvertures exceptionnelles par prestataire.
-- staff_id NULL = s'applique à tout le salon.
-- staff_id = UUID = s'applique uniquement à cette prestataire.
-- ON DELETE SET NULL : si la prestataire est supprimée, la règle devient salon-entier.

ALTER TABLE exception_closures
  ADD COLUMN staff_id uuid REFERENCES staff(id) ON DELETE SET NULL;

ALTER TABLE exception_openings
  ADD COLUMN staff_id uuid REFERENCES staff(id) ON DELETE SET NULL;

CREATE INDEX idx_exception_closures_staff_id ON exception_closures (salon_id, staff_id);
CREATE INDEX idx_exception_openings_staff_id ON exception_openings (salon_id, staff_id);
