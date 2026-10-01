// Parses interlinear glossed examples written in a ```gloss block:
//
//   tama-ki   nami
//   water-PL  run
//   "The waters run."
//
// Each line before the translation is a tier; words line up by position.
// A last line wrapped in quotes is the free translation. Grammatical
// abbreviations in capitals (PL, 1SG, ERG) are marked so they can be shown
// in small caps, per the Leipzig Glossing Rules.

export type GlossPart = { text: string; abbrev: boolean };

export type Interlinear = {
  /** columns[i][t] is word i on tier t. */
  columns: string[][];
  tiers: number;
  translation: string | null;
  /** Set when tiers don't have the same number of words. */
  warning: string | null;
};

const quoted = /^\s*["“‘'](.*)["”’']\s*$/;

export function parseInterlinear(source: string): Interlinear {
  const lines = source
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  let translation: string | null = null;
  const last = lines[lines.length - 1];
  const m = last?.match(quoted);
  if (m && lines.length > 1) {
    translation = m[1].trim();
    lines.pop();
  }

  const tiers = lines.map((l) => l.split(/\s+/));
  const width = Math.max(0, ...tiers.map((t) => t.length));
  const columns = Array.from({ length: width }, (_, i) => tiers.map((t) => t[i] ?? ""));
  const uneven = new Set(tiers.map((t) => t.length)).size > 1;

  return {
    columns,
    tiers: tiers.length,
    translation,
    warning: uneven ? `Lines have different word counts (${tiers.map((t) => t.length).join(", ")})` : null,
  };
}

/**
 * Splits a gloss word like "water-PL.ACC" into parts, flagging grammatical
 * abbreviations (runs of capitals and digits, e.g. 3SG) for small caps.
 */
export function splitGloss(word: string): GlossPart[] {
  const parts: GlossPart[] = [];
  for (const piece of word.split(/([-=.:~<>\\])/)) {
    if (!piece) continue;
    const abbrev = /^(?=.*[A-Z])[A-Z0-9]+$/.test(piece) && piece.length > 0;
    parts.push({ text: abbrev ? piece.toLowerCase() : piece, abbrev });
  }
  return parts;
}
