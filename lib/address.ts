/**
 * Extrait la ville d'une adresse en texte libre (ex: "33 Rue Gabriel Péri, 13340 Rognac")
 * en repérant le motif "code postal + ville" en fin de chaîne — format standard des adresses
 * françaises saisies par les salons dans le back-office (champ libre, pas de colonnes séparées).
 */
export function cityFromAddress(address: string | null | undefined): string | null {
  if (!address) return null;
  const match = address.match(/\d{5}\s+(.+)$/);
  return match ? match[1].trim() : null;
}
