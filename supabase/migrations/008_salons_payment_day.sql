-- Jour du mois où le salon est censé être prélevé (1-31), affiché
-- dans le dashboard admin sous "Date de prélèvement".
ALTER TABLE salons ADD COLUMN payment_day smallint;
