const PATTERN_BG_LAYERS: Record<string, string> = {
  lignes: "repeating-linear-gradient(0deg,rgba(0,0,0,0.05) 0px,rgba(0,0,0,0.05) 1px,transparent 1px,transparent 12px)",
  chevrons: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20'%3E%3Cpath d='M0 20L10 0L20 20L30 0L40 20' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='1.5'/%3E%3C/svg%3E\") 0 0 / 40px 20px",
  vagues: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='20'%3E%3Cpath d='M0 10 Q10 4 20 10 T40 10' fill='none' stroke='rgba(0,0,0,0.08)' stroke-width='1.5'/%3E%3C/svg%3E\") 0 0 / 40px 20px",
  etoiles: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='28'%3E%3Cpath d='M14 0L17 11L28 14L17 17L14 28L11 17L0 14L11 11Z' fill='rgba(0,0,0,0.09)'/%3E%3C/svg%3E\") 0 0 / 28px 28px",
  grid: "linear-gradient(rgba(0,0,0,0.055) 1px,transparent 1px) 0 0 / 32px 32px,linear-gradient(90deg,rgba(0,0,0,0.055) 1px,transparent 1px) 0 0 / 32px 32px",
  dots: "radial-gradient(circle,rgba(0,0,0,0.13) 1px,transparent 1px) 0 0 / 24px 24px",
  circles: "radial-gradient(circle at center,rgba(0,0,0,0.08) 14px,transparent 14px) 0 0 / 48px 48px",
  bubbles: "radial-gradient(circle at center,transparent 10px,rgba(0,0,0,0.08) 11px,rgba(0,0,0,0.08) 12px,transparent 13px) 0 0 / 40px 40px",
  diagonal: "repeating-linear-gradient(45deg,rgba(0,0,0,0.045) 0px,rgba(0,0,0,0.045) 1px,transparent 1px,transparent 14px)",
  grain: "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.055'/%3E%3C/svg%3E\") 0 0 / 200px 200px",
  hexagons: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='28' height='49'%3E%3Cpath d='M14 1l13 7.5v15L14 31 1 23.5v-15z' fill='none' stroke='rgba(0%2C0%2C0%2C0.08)' stroke-width='1'/%3E%3C/svg%3E\") 0 0 / 28px 49px",
};

function isDark(hex: string): boolean {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 < 140;
}

export function getPatternBgLayer(pattern?: string | null, bgColor?: string): string {
  if (!pattern || pattern === "none") return "";
  const layer = PATTERN_BG_LAYERS[pattern] ?? "";
  if (!layer) return "";
  if (bgColor && isDark(bgColor)) {
    return layer.replace(/rgba\(0,0,0,/g, "rgba(255,255,255,");
  }
  return layer;
}

// Composant no-op conservé pour compatibilité des imports existants
export function SitePattern(_: { pattern?: string | null }) {
  return null;
}

export const PATTERN_OPTIONS = [
  { value: "none", label: "Aucun" },
  { value: "lignes", label: "Lignes" },
  { value: "chevrons", label: "Chevrons" },
  { value: "vagues", label: "Vagues" },
  { value: "etoiles", label: "Étoiles" },
  { value: "dots", label: "Points" },
  { value: "circles", label: "Cercles" },
  { value: "bubbles", label: "Bulles" },
  { value: "grid", label: "Quadrillage" },
  { value: "diagonal", label: "Diagonales" },
  { value: "grain", label: "Grain" },
  { value: "hexagons", label: "Hexagones" },
] as const;
