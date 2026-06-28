-- Ouvertures exceptionnelles : permet d'ouvrir le salon un jour normalement fermé
-- (ex: un dimanche ou un lundi si le salon est fermé ce jour-là).
-- La réservation publique et la validation serveur tiennent compte de ces ouvertures.

CREATE TABLE exception_openings (
  id            uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  salon_id      uuid         NOT NULL REFERENCES salons(id) ON DELETE CASCADE,
  opening_date  date         NOT NULL,
  opening_time  time         NOT NULL DEFAULT '09:00',
  closing_time  time         NOT NULL DEFAULT '19:00',
  reason        text,
  created_at    timestamptz  DEFAULT now()
);

CREATE INDEX idx_exception_openings_salon_id ON exception_openings (salon_id);
CREATE INDEX idx_exception_openings_date     ON exception_openings (salon_id, opening_date);

ALTER TABLE exception_openings ENABLE ROW LEVEL SECURITY;

-- Lecture et écriture scopées au membre du salon
CREATE POLICY exception_openings_authenticated_write ON exception_openings
  FOR ALL TO authenticated
  USING  (is_salon_member(salon_id))
  WITH CHECK (is_salon_member(salon_id));
