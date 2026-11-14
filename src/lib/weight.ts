/**
 * Many fonts ship a usWeightClass that does not match their style (every file
 * at 400, Windows style-linking quirks, or the old 1–9 scale), so sorting by
 * OS/2 alone puts weights in the wrong order. Style names are what designers
 * see, so they win when they name a weight.
 */
const keywords: Array<[string, number]> = [
  ['extrablack', 950],
  ['ultrablack', 950],
  ['hairline', 100],
  ['extrathin', 100],
  ['ultrathin', 100],
  ['thin', 100],
  ['extralight', 200],
  ['ultralight', 200],
  ['xlight', 200],
  ['semilight', 350],
  ['demilight', 350],
  ['light', 300],
  ['book', 400],
  ['regular', 400],
  ['normal', 400],
  ['medium', 500],
  ['semibold', 600],
  ['demibold', 600],
  ['extrabold', 800],
  ['ultrabold', 800],
  ['xbold', 800],
  ['bold', 700],
  ['heavy', 900],
  ['black', 900],
  // Persian style names used by Iranian foundries.
  ['فوقسبک', 200],
  ['نازک', 100],
  ['سبک', 300],
  ['معمولی', 400],
  ['متوسط', 500],
  ['نیمهضخیم', 600],
  ['فوقضخیم', 800],
  ['ضخیم', 700],
  ['سیاه', 900],
];

const normalize = (value: string) => value.toLowerCase().replace(/[\s_\-.‌]/g, '');

export function weightFromName(value: string | undefined): number | null {
  if (!value) return null;
  const name = normalize(value);
  for (const [keyword, weight] of keywords) if (name.includes(keyword)) return weight;
  return null;
}

export function normalizeWeightClass(value: number | undefined): number | null {
  if (!value || !Number.isFinite(value)) return null;
  return value < 10 ? value * 100 : value;
}

/**
 * Sources are tried in order. The typographic subfamily is the most reliable;
 * the legacy subfamily is last because it reads "Regular" for every non-RIBBI style.
 */
export function inferWeight({
  typographicSubfamily,
  names,
  legacySubfamily,
  weightClass,
  variableDefault,
}: {
  typographicSubfamily?: string;
  names: Array<string | undefined>;
  legacySubfamily?: string;
  weightClass?: number;
  variableDefault?: number;
}): number {
  if (variableDefault !== undefined) return variableDefault;
  return (
    weightFromName(typographicSubfamily) ??
    names.map(weightFromName).find((weight) => weight !== null) ??
    weightFromName(legacySubfamily) ??
    normalizeWeightClass(weightClass) ??
    400
  );
}
