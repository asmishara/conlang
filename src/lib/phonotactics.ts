// Checks words against a language's phonotactics: the sound categories,
// syllable patterns and forbidden sequences saved with its word generator.

import { parsePattern, type Category, type PatternNode } from "./generator";
import { segment } from "./orthography";

export type Phonotactics = { categories: Category[]; patterns: string[]; forbidden: string[] };

export type PhonotacticProblem =
  | { kind: "forbidden"; sequence: string }
  | { kind: "sounds"; sounds: string[] }
  | { kind: "syllables"; fitted: string; rest: string };

export type Checker = (ipa: string) => PhonotacticProblem[];

// Slashes, brackets, stress marks, syllable breaks and links between words.
const MARKS = /[/[\]ˈˌ.‿]/g;

/** Reads saved generator settings (categories are stored as JSON), or null when nothing is saved. */
export function phonotacticsOf(
  saved: { categories: unknown; patterns: string[]; forbidden: string[] } | null,
): Phonotactics | null {
  if (!saved || !Array.isArray(saved.categories)) return null;
  const categories = saved.categories.filter(
    (c): c is Category => typeof c?.label === "string" && Array.isArray(c?.members),
  );
  return { categories, patterns: saved.patterns, forbidden: saved.forbidden };
}

/** Positions in `s` where `nodes` can finish matching when started at `start`. */
function ends(nodes: PatternNode[], s: string, start: number, cats: Map<string, string[]>): Set<number> {
  let positions = new Set([start]);
  for (const node of nodes) {
    const next = new Set<number>();
    for (const p of positions) {
      if (node.type === "literal") {
        if (s.startsWith(node.text, p)) next.add(p + node.text.length);
      } else if (node.type === "category") {
        for (const m of cats.get(node.label)!) if (s.startsWith(m, p)) next.add(p + m.length);
      } else {
        next.add(p);
        for (const e of ends(node.nodes, s, p, cats)) next.add(e);
      }
    }
    positions = next;
    if (positions.size === 0) break;
  }
  return positions;
}

/** How much of `s` splits into whole syllables: all of it when the word fits. */
function fit(s: string, patterns: PatternNode[][], cats: Map<string, string[]>): number {
  const reached = new Set([0]);
  const queue = [0];
  while (queue.length > 0) {
    const pos = queue.shift()!;
    for (const nodes of patterns) {
      for (const end of ends(nodes, s, pos, cats)) {
        if (end > pos && !reached.has(end)) {
          reached.add(end);
          queue.push(end);
        }
      }
    }
  }
  return Math.max(...reached);
}

/**
 * Builds a checker from saved settings, or returns null when the patterns
 * can't be used. Each word in a phrase or compound (split on spaces and
 * hyphens) must split into syllables that each match a pattern. Syllable
 * counts aren't checked, since they only steer the generator.
 */
export function compilePhonotactics(p: Phonotactics): Checker | null {
  const cats = new Map(
    p.categories.map((c) => [c.label, c.members.map((m) => m.normalize("NFC")).filter(Boolean)] as const),
  );
  const labels = new Set(cats.keys());
  const patterns: PatternNode[][] = [];
  for (const raw of p.patterns) {
    const parsed = parsePattern(raw, labels);
    if ("error" in parsed) return null;
    patterns.push(parsed.nodes);
  }
  if (patterns.length === 0) return null;

  // Every sound a pattern can produce, so a problem can name the ones none can.
  const allowed = new Set<string>();
  const collect = (nodes: PatternNode[]) => {
    for (const node of nodes) {
      if (node.type === "literal") allowed.add(node.text);
      else if (node.type === "category") for (const m of cats.get(node.label)!) allowed.add(m);
      else collect(node.nodes);
    }
  };
  patterns.forEach(collect);
  const symbols = [...allowed].map((ipa) => ({ ipa, spelling: ipa }));
  const forbidden = p.forbidden.map((f) => f.normalize("NFC")).filter(Boolean);

  return (ipa) => {
    const problems: PhonotacticProblem[] = [];
    const seen = new Set<string>();
    const add = (problem: PhonotacticProblem) => {
      const key = JSON.stringify(problem);
      if (!seen.has(key)) problems.push(problem);
      seen.add(key);
    };

    const pieces = ipa.normalize("NFC").replace(MARKS, "").split(/[\s-]+/).filter(Boolean);
    for (const piece of pieces) {
      for (const f of forbidden) if (piece.includes(f)) add({ kind: "forbidden", sequence: f });
      const fitted = fit(piece, patterns, cats);
      if (fitted === piece.length) continue;
      const unknown = segment(piece, symbols)
        .filter((s) => !s.known)
        .map((s) => s.ipa);
      if (unknown.length > 0) add({ kind: "sounds", sounds: [...new Set(unknown)] });
      else add({ kind: "syllables", fitted: piece.slice(0, fitted), rest: piece.slice(fitted) });
    }
    return problems;
  };
}

/**
 * Checks a lexicon entry. Affixes aren't checked (they needn't be whole
 * syllables), and neither are words whose pronunciation was derived from a
 * spelling with letters the rules don't cover, since that is flagged already.
 */
export function wordProblems(
  check: Checker | null,
  word: { form: string; ipa: string | null; partOfSpeech?: string | null; unreadable?: boolean },
): PhonotacticProblem[] {
  if (!check || !word.ipa || word.unreadable) return [];
  const form = word.form.trim();
  if (word.partOfSpeech === "affix" || form.startsWith("-") || form.endsWith("-")) return [];
  return check(word.ipa);
}

function list(items: string[]): string {
  const quoted = items.map((i) => `“${i}”`);
  return quoted.length < 2 ? quoted.join("") : `${quoted.slice(0, -1).join(", ")} and ${quoted.at(-1)}`;
}

/** A sentence a person can act on. */
export function describeProblem(p: PhonotacticProblem): string {
  switch (p.kind) {
    case "forbidden":
      return `Contains “${p.sequence}”, which is a forbidden sequence`;
    case "sounds":
      return `Has ${list(p.sounds)}, which no syllable pattern allows`;
    case "syllables":
      return p.fitted
        ? `No syllable pattern fits “${p.rest}” after “${p.fitted}”`
        : `No syllable pattern fits the start of “${p.rest}”`;
  }
}
