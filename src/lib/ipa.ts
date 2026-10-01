// IPA chart data for the phoneme picker. Each cell lists its symbols in
// chart order: [voiceless, voiced] for consonants, [unrounded, rounded] for
// vowels. null marks an empty slot so columns line up.

export type Cell = (string | null)[];

export const consonantPlaces = [
  "Bilabial",
  "Labiodental",
  "Dental",
  "Alveolar",
  "Postalveolar",
  "Retroflex",
  "Palatal",
  "Velar",
  "Uvular",
  "Pharyngeal",
  "Glottal",
] as const;

export const consonantRows: { manner: string; cells: Cell[] }[] = [
  {
    manner: "Plosive",
    cells: [["p", "b"], [], [], ["t", "d"], [], ["ʈ", "ɖ"], ["c", "ɟ"], ["k", "ɡ"], ["q", "ɢ"], [], ["ʔ", null]],
  },
  {
    manner: "Nasal",
    cells: [[null, "m"], [null, "ɱ"], [], [null, "n"], [], [null, "ɳ"], [null, "ɲ"], [null, "ŋ"], [null, "ɴ"], [], []],
  },
  {
    manner: "Trill",
    cells: [[null, "ʙ"], [], [], [null, "r"], [], [], [], [], [null, "ʀ"], [], []],
  },
  {
    manner: "Tap or flap",
    cells: [[], [null, "ⱱ"], [], [null, "ɾ"], [], [null, "ɽ"], [], [], [], [], []],
  },
  {
    manner: "Fricative",
    cells: [["ɸ", "β"], ["f", "v"], ["θ", "ð"], ["s", "z"], ["ʃ", "ʒ"], ["ʂ", "ʐ"], ["ç", "ʝ"], ["x", "ɣ"], ["χ", "ʁ"], ["ħ", "ʕ"], ["h", "ɦ"]],
  },
  {
    manner: "Affricate",
    cells: [[], [], [], ["t͡s", "d͡z"], ["t͡ʃ", "d͡ʒ"], ["ʈ͡ʂ", "ɖ͡ʐ"], [], [], [], [], []],
  },
  {
    manner: "Lateral fricative",
    cells: [[], [], [], ["ɬ", "ɮ"], [], [], [], [], [], [], []],
  },
  {
    manner: "Approximant",
    cells: [[], [null, "ʋ"], [], [null, "ɹ"], [], [null, "ɻ"], [null, "j"], [null, "ɰ"], [], [], []],
  },
  {
    manner: "Lateral approximant",
    cells: [[], [], [], [null, "l"], [], [null, "ɭ"], [null, "ʎ"], [null, "ʟ"], [], [], []],
  },
];

/** Consonants that don't fit the main grid. */
export const otherConsonants = ["w", "ʍ", "ɥ", "ɕ", "ʑ", "t͡ɕ", "d͡ʑ", "ɧ"];

export const vowelBackness = ["Front", "Central", "Back"] as const;

export const vowelRows: { height: string; cells: Cell[] }[] = [
  { height: "Close", cells: [["i", "y"], ["ɨ", "ʉ"], ["ɯ", "u"]] },
  { height: "Near-close", cells: [["ɪ", "ʏ"], [], [null, "ʊ"]] },
  { height: "Close-mid", cells: [["e", "ø"], ["ɘ", "ɵ"], ["ɤ", "o"]] },
  { height: "Mid", cells: [[], ["ə", null], []] },
  { height: "Open-mid", cells: [["ɛ", "œ"], ["ɜ", "ɞ"], ["ʌ", "ɔ"]] },
  { height: "Near-open", cells: [["æ", null], ["ɐ", null], []] },
  { height: "Open", cells: [["a", "ɶ"], [], ["ɑ", "ɒ"]] },
];

/** Every symbol on the charts, with the kind of sound it is. */
export const chartSymbols: ReadonlyMap<string, "CONSONANT" | "VOWEL"> = new Map([
  ...consonantRows.flatMap((r) => r.cells.flat()).map((s) => [s, "CONSONANT"] as const),
  ...otherConsonants.map((s) => [s, "CONSONANT"] as const),
  ...vowelRows.flatMap((r) => r.cells.flat()).map((s) => [s, "VOWEL"] as const),
].filter((e): e is readonly [string, "CONSONANT" | "VOWEL"] => e[0] !== null));
