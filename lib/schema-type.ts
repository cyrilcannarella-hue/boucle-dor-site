// Déduit un @type schema.org plus précis que "LocalBusiness" à partir du
// champ libre salon_settings.business_type, pour aider Google à mieux
// catégoriser le site (rich results / local pack).
export function schemaTypeFromBusinessType(businessType?: string | null): string {
  const value = (businessType ?? "").trim().toLowerCase();
  if (!value) return "LocalBusiness";
  if (value.includes("coiff") || value.includes("barbe")) return "HairSalon";
  if (value.includes("ongle") || value.includes("manucure") || value.includes("nail")) return "NailSalon";
  if (value.includes("spa") || value.includes("massage")) return "DaySpa";
  if (value.includes("beaut") || value.includes("esthé") || value.includes("institut")) return "BeautySalon";
  return "HealthAndBeautyBusiness";
}
