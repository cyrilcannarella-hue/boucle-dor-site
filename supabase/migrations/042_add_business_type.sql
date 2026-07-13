-- Type d'activité du salon (ex: "Coiffeur", "Praticienne en massage"), utilisé
-- dans le titre de la page / partage social (auparavant "Coiffeur" codé en dur
-- pour tous les salons, faux pour les salons non-coiffure). Vide par défaut,
-- jamais de valeur fictive : chaque salon doit le renseigner lui-même.
alter table salon_settings
  add column if not exists business_type text;
