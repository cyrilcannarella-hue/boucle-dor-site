// ============================================================
//  Boucle d'Or — Thème central
//  Toutes les constantes de marque sont définies ici.
//  Importer depuis ce fichier plutôt que d'écrire les valeurs
//  en dur dans les composants.
// ============================================================

// ── Marque ──────────────────────────────────────────────────
export const BRAND_NAME = "Boucle d'Or";
export const BRAND_NAME_PRO = "Boucle d'Or Pro";

// ── Couleurs principales ─────────────────────────────────────
/** Or principal — couleur signature de la marque */
export const GOLD = "#b98b3d";

/** Beige clair — fond général */
export const BEIGE_LIGHT = "#eadfce";

/** Beige moyen — fonds secondaires */
export const BEIGE_MID = "#e7ddd0";

/** Beige chaud — fond header */
export const BEIGE_WARM = "#f4eadc";

/** Crème — fonds très clairs */
export const CREAM = "#fcfaf7";

/** Crème pure */
export const CREAM_PURE = "#fffdf9";

/** Crème dorée */
export const CREAM_GOLD = "#fffaf4";

/** Or secondaire — accents lumineux */
export const GOLD_LIGHT = "#d8b56d";

/** Or foncé — variante profonde */
export const GOLD_DEEP = "#d8a646";

/** Taupe foncé — texte principal */
export const TAUPE_DARK = "#1f1b17";

/** Taupe — texte secondaire */
export const TAUPE = "#6e655c";

/** Taupe moyen */
export const TAUPE_MID = "#6f6254";

/** Taupe profond */
export const TAUPE_DEEP = "#4d453d";

/** Brun très foncé */
export const BROWN_DEEP = "#2b2116";

/** Beige grisé — bordures */
export const BORDER = "#dccdbb";

/** Rouge erreur */
export const RED_ERROR = "#a33a3a";

/** Rouge clair — fond erreur */
export const RED_LIGHT = "#fff1f1";

/** Rouge pastel — accents erreur */
export const RED_PASTEL = "#efc9c9";

/** Vert succès */
export const GREEN_SUCCESS = "#1f6a3a";

/** Noir texte */
export const BLACK = "#111111";

// ── Utilitaires Tailwind ─────────────────────────────────────
// Ces chaînes sont utilisables directement dans les className.
// Exemple : `text-[${tw.gold}]`  →  `text-[#b98b3d]`
export const tw = {
  gold: GOLD,
  beigeLight: BEIGE_LIGHT,
  beigeMid: BEIGE_MID,
  beigeWarm: BEIGE_WARM,
  cream: CREAM,
  creamPure: CREAM_PURE,
  creamGold: CREAM_GOLD,
  goldLight: GOLD_LIGHT,
  goldDeep: GOLD_DEEP,
  taupeDark: TAUPE_DARK,
  taupe: TAUPE,
  taupeMid: TAUPE_MID,
  taupeDeep: TAUPE_DEEP,
  brownDeep: BROWN_DEEP,
  border: BORDER,
  redError: RED_ERROR,
  redLight: RED_LIGHT,
  redPastel: RED_PASTEL,
  greenSuccess: GREEN_SUCCESS,
  black: BLACK,
} as const;
