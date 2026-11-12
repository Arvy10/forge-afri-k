/**
 * Normalise un code saisi : espaces retirés aux extrémités, et apostrophes / guillemets « typographiques »
 * (insérés automatiquement par certains claviers de téléphone) ramenés à leur forme simple.
 * Appliqué des deux côtés (saisie ET code de référence) pour qu'un code avec apostrophe simple
 * et le même code avec apostrophe typographique soient équivalents.
 */
export function normalizeCode(value: string): string {
  return value
    .normalize("NFC")
    .replace(/[‘’ʼ′`´]/g, "'")
    .replace(/[“”″]/g, '"')
    .trim();
}
