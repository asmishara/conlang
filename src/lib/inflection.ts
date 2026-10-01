// Inflection tables. A paradigm crosses up to three dimensions (e.g. case ×
// number), and each cell has a rule that builds the form from the word as
// written. A rule is one or more alternatives separated by ";", and the
// first that fits the word wins:
//
//   ~ka         the word followed by "ka" (shorthand: -ka)
//   ma~         "ma" followed by the word (shorthand: ma-)
//   ~a → ~e     only for words ending in "a", which becomes "e"
//   ~V → ~Vn    capital letters are sound classes (C and V by default),
//               and in the result they repeat the sound they matched
//   CV~ → CVCV~ so partial reduplication works too
//
// A word that no alternative fits has no form in that cell.

import type { Category } from "./generator";

export type Dimension = { name: string; values: string[] };
/** Each class letter and the spellings it stands for. */
export type SoundClasses = Map<string, string[]>;

type Piece = { type: "text"; text: string } | { type: "class"; label: string };
type ResultPiece = Piece | { type: "stem" };
type Alternative = { before: Piece[]; after: Piece[]; result: ResultPiece[] };
export type Rule = Alternative[];

const ARROW = /\s*(?:→|->|=>|>)\s*/;

/** The key a cell's rule is stored under: its values, in dimension order. */
export function cellKey(values: string[]): string {
  return JSON.stringify(values);
}

/** Every combination of values, first dimension slowest. */
export function cellsOf(dimensions: Dimension[]): string[][] {
  return dimensions.reduce<string[][]>(
    (acc, d) => acc.flatMap((prefix) => d.values.map((v) => [...prefix, v])),
    [[]],
  );
}

/** C and V from the inventory, plus any word generator categories, as spellings. */
export function soundClasses(
  phonemes: { ipa: string; kind: "CONSONANT" | "VOWEL"; spelling: string }[],
  categories: Category[] = [],
): SoundClasses {
  const spellingOf = new Map(phonemes.map((p) => [p.ipa.normalize("NFC"), p.spelling.normalize("NFC")]));
  const classes: SoundClasses = new Map();
  const set = (label: string, members: string[]) =>
    // Longest first, so "ng" is tried before "n".
    classes.set(label, [...new Set(members.filter(Boolean))].sort((a, b) => b.length - a.length));
  set("C", phonemes.filter((p) => p.kind === "CONSONANT").map((p) => p.spelling.normalize("NFC")));
  set("V", phonemes.filter((p) => p.kind === "VOWEL").map((p) => p.spelling.normalize("NFC")));
  for (const c of categories) set(c.label, c.members.map((m) => spellingOf.get(m.normalize("NFC")) ?? m));
  return classes;
}

function toPieces(text: string, classes: SoundClasses): Piece[] | string {
  const out: Piece[] = [];
  for (const ch of text) {
    if (/^[A-Z]$/.test(ch)) {
      if (!classes.has(ch)) return `There's no sound class ${ch}`;
      out.push({ type: "class", label: ch });
    } else {
      const last = out.at(-1);
      if (last?.type === "text") last.text += ch;
      else out.push({ type: "text", text: ch });
    }
  }
  return out;
}

/** Parses a cell's rule. An empty rule is valid and gives no form. */
export function parseRule(source: string, classes: SoundClasses): { rule: Rule } | { error: string } {
  const rule: Rule = [];
  for (const part of source.normalize("NFC").split(";")) {
    const text = part.trim();
    if (!text) continue;
    const sides = text.split(ARROW);
    if (sides.length > 2) return { error: `“${text}” has more than one arrow` };
    const [match, rawResult] = sides.length === 2 ? sides : ["~", sides[0]];

    let result = rawResult;
    if (!result.includes("~") && result.length > 1) {
      if (result.startsWith("-")) result = `~${result.slice(1)}`;
      else if (result.endsWith("-")) result = `${result.slice(0, -1)}~`;
    }
    if (sides.length === 1 && !result.includes("~")) {
      return { error: `Use ~ for the word, as in ~${text} or ${text}~` };
    }

    const stems = match.split("~");
    if (stems.length !== 2) return { error: `“${match}” needs exactly one ~ for the word` };
    const before = toPieces(stems[0], classes);
    const after = toPieces(stems[1], classes);
    if (typeof before === "string") return { error: before };
    if (typeof after === "string") return { error: after };

    const resultPieces: ResultPiece[] = [];
    for (const [i, chunk] of result.split("~").entries()) {
      if (i > 0) resultPieces.push({ type: "stem" });
      const pieces = toPieces(chunk, classes);
      if (typeof pieces === "string") return { error: pieces };
      resultPieces.push(...pieces);
    }
    const matched = new Set([...before, ...after].flatMap((p) => (p.type === "class" ? [p.label] : [])));
    for (const p of resultPieces) {
      if (p.type === "class" && !matched.has(p.label)) {
        return { error: `${p.label} in “${result}” must also appear before the arrow` };
      }
    }
    rule.push({ before, after, result: resultPieces });
  }
  return { rule };
}

type Capture = [label: string, text: string];
type Match = { at: number; captures: Capture[] };

/** Ways `pieces` can match `word` reading forwards from `pos`. */
function matchForward(pieces: Piece[], word: string, pos: number, classes: SoundClasses): Match[] {
  if (pieces.length === 0) return [{ at: pos, captures: [] }];
  const [first, ...rest] = pieces;
  const options = first.type === "text" ? [first.text] : classes.get(first.label)!;
  return options.flatMap((option) => {
    if (!word.startsWith(option, pos)) return [];
    const captures: Capture[] = first.type === "class" ? [[first.label, option]] : [];
    return matchForward(rest, word, pos + option.length, classes).map((m) => ({
      at: m.at,
      captures: [...captures, ...m.captures],
    }));
  });
}

/** Ways `pieces` can match `word` ending exactly at `end`; `at` is where the match starts. */
function matchBackward(pieces: Piece[], word: string, end: number, classes: SoundClasses): Match[] {
  if (pieces.length === 0) return [{ at: end, captures: [] }];
  const last = pieces.at(-1)!;
  const rest = pieces.slice(0, -1);
  const options = last.type === "text" ? [last.text] : classes.get(last.label)!;
  return options.flatMap((option) => {
    const start = end - option.length;
    if (start < 0 || word.slice(start, end) !== option) return [];
    const captures: Capture[] = last.type === "class" ? [[last.label, option]] : [];
    return matchBackward(rest, word, start, classes).map((m) => ({
      at: m.at,
      captures: [...m.captures, ...captures],
    }));
  });
}

/** The inflected form, or null when no alternative fits the word. */
export function applyRule(rule: Rule, word: string, classes: SoundClasses): string | null {
  const w = word.normalize("NFC");
  for (const alt of rule) {
    for (const b of matchForward(alt.before, w, 0, classes)) {
      for (const a of matchBackward(alt.after, w, w.length, classes)) {
        if (b.at > a.at) continue;
        const stem = w.slice(b.at, a.at);
        const captures = [...b.captures, ...a.captures];
        const used = new Map<string, number>();
        let out = "";
        for (const p of alt.result) {
          if (p.type === "text") out += p.text;
          else if (p.type === "stem") out += stem;
          else {
            // The nth use of a class letter repeats its nth match, cycling.
            const matches = captures.filter(([label]) => label === p.label);
            const n = used.get(p.label) ?? 0;
            out += matches[n % matches.length][1];
            used.set(p.label, n + 1);
          }
        }
        return out;
      }
    }
  }
  return null;
}

export type Cell = {
  values: string[];
  /** The form, or null when the word has none for this cell. */
  form: string | null;
  /** What the cell's rule gives, which an irregular form replaces. */
  regular: string | null;
  irregular: boolean;
  error?: string;
};

/**
 * Fills in every cell of a paradigm for one word. `irregular` holds the
 * word's own forms by cell key, where "" means it has no form there.
 */
export function inflect(
  word: string,
  paradigm: { dimensions: Dimension[]; rules: Record<string, string> },
  classes: SoundClasses,
  irregular: Record<string, string> = {},
): Cell[] {
  return cellsOf(paradigm.dimensions).map((values) => {
    const key = cellKey(values);
    const parsed = parseRule(paradigm.rules[key] ?? "", classes);
    const regular = "error" in parsed ? null : applyRule(parsed.rule, word, classes);
    const error = "error" in parsed ? parsed.error : undefined;
    if (key in irregular) return { values, form: irregular[key] || null, regular, irregular: true, error };
    return { values, form: regular, regular, irregular: false, error };
  });
}

/** Problems with a table's layout (names and values), before any rules are checked. */
export function shapeProblems(dimensions: Dimension[]): string[] {
  const problems: string[] = [];
  if (dimensions.length === 0) problems.push("Add at least one dimension");
  if (dimensions.length > 3) problems.push("A table can have at most three dimensions");
  for (const [i, d] of dimensions.entries()) {
    const name = d.name.trim() || `Dimension ${i + 1}`;
    if (!d.name.trim()) problems.push(`Dimension ${i + 1} needs a name`);
    if (d.values.length === 0) problems.push(`${name} needs at least one value`);
    if (d.values.length > 20) problems.push(`${name} can have at most 20 values`);
    if (d.values.some((v) => !v.trim())) problems.push(`${name} has an empty value`);
    const trimmed = d.values.map((v) => v.trim().normalize("NFC")).filter(Boolean);
    const dupes = trimmed.filter((v, j) => trimmed.indexOf(v) !== j);
    for (const v of new Set(dupes)) problems.push(`${name} lists “${v}” twice`);
  }
  return problems;
}
