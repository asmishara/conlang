// Random word generation from sound categories and syllable patterns.
//
// A pattern is a string like "C(L)V(N)": uppercase letters A–Z name a
// category, parentheses mark an optional part (included half the time),
// and anything else is copied literally as IPA.

export type Category = { label: string; members: string[] };

export type GeneratorSettings = {
  categories: Category[];
  patterns: string[];
  minSyllables: number;
  maxSyllables: number;
  /** When true, earlier members of a category (and earlier patterns) are picked more often. */
  dropoff: boolean;
  /** IPA sequences a word may not contain, e.g. "ji" or "ŋŋ". */
  forbidden: string[];
};

type Node = { type: "category"; label: string } | { type: "literal"; text: string } | { type: "optional"; nodes: Node[] };

export type Rng = () => number;

/** Small seedable PRNG (mulberry32), so tests are deterministic. */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parses a pattern, or returns an error message a person can act on. */
export function parsePattern(pattern: string, labels: Set<string>): { nodes: Node[] } | { error: string } {
  const stack: Node[][] = [[]];
  let literal = "";
  const flush = () => {
    if (literal) stack[stack.length - 1].push({ type: "literal", text: literal });
    literal = "";
  };

  for (const ch of pattern.normalize("NFC").replace(/\s+/g, "")) {
    if (ch === "(") {
      flush();
      stack.push([]);
    } else if (ch === ")") {
      flush();
      if (stack.length === 1) return { error: `"${pattern}" has a ")" without a matching "("` };
      const nodes = stack.pop()!;
      stack[stack.length - 1].push({ type: "optional", nodes });
    } else if (/^[A-Z]$/.test(ch)) {
      flush();
      if (!labels.has(ch)) return { error: `"${pattern}" uses ${ch}, but there is no category ${ch}` };
      stack[stack.length - 1].push({ type: "category", label: ch });
    } else {
      literal += ch;
    }
  }
  flush();
  if (stack.length !== 1) return { error: `"${pattern}" has a "(" without a matching ")"` };
  if (stack[0].length === 0) return { error: "A pattern can't be empty" };
  return { nodes: stack[0] };
}

/** Checks settings and returns the problems, if any. */
export function validateSettings(s: GeneratorSettings): string[] {
  const problems: string[] = [];
  const labels = new Set<string>();
  for (const c of s.categories) {
    if (!/^[A-Z]$/.test(c.label)) problems.push(`Category names must be a single capital letter (got "${c.label}")`);
    else if (labels.has(c.label)) problems.push(`Category ${c.label} is defined twice`);
    else if (c.members.length === 0) problems.push(`Category ${c.label} has no sounds`);
    labels.add(c.label);
  }
  if (s.patterns.length === 0) problems.push("Add at least one syllable pattern");
  for (const p of s.patterns) {
    const parsed = parsePattern(p, labels);
    if ("error" in parsed) problems.push(parsed.error);
  }
  if (s.minSyllables < 1 || s.maxSyllables < s.minSyllables) {
    problems.push("Syllables: the minimum must be at least 1 and no more than the maximum");
  }
  return problems;
}

/** Index into a list, weighted towards the start when dropoff is on. */
function pick(n: number, dropoff: boolean, rng: Rng): number {
  if (!dropoff) return Math.floor(rng() * n);
  // Weights 1, 1/2, 1/3, ... (a Zipf-like curve, like real sound frequencies).
  let total = 0;
  for (let i = 1; i <= n; i++) total += 1 / i;
  let r = rng() * total;
  for (let i = 0; i < n; i++) {
    r -= 1 / (i + 1);
    if (r < 0) return i;
  }
  return n - 1;
}

function render(nodes: Node[], cats: Map<string, string[]>, dropoff: boolean, rng: Rng): string {
  let out = "";
  for (const node of nodes) {
    if (node.type === "literal") out += node.text;
    else if (node.type === "optional") out += rng() < 0.5 ? render(node.nodes, cats, dropoff, rng) : "";
    else {
      const members = cats.get(node.label)!;
      out += members[pick(members.length, dropoff, rng)];
    }
  }
  return out;
}

/**
 * Generates up to `count` distinct words (as IPA). Words containing a
 * forbidden sequence, or listed in `exclude`, are skipped. Returns fewer
 * words when the settings can't produce enough distinct ones.
 */
export function generateWords(
  settings: GeneratorSettings,
  count: number,
  rng: Rng = Math.random,
  exclude: ReadonlySet<string> = new Set(),
): string[] {
  if (validateSettings(settings).length > 0) return [];
  const labels = new Set(settings.categories.map((c) => c.label));
  const patterns = settings.patterns.map((p) => (parsePattern(p, labels) as { nodes: Node[] }).nodes);
  const cats = new Map(settings.categories.map((c) => [c.label, c.members]));
  const forbidden = settings.forbidden.map((f) => f.normalize("NFC")).filter(Boolean);

  const words = new Set<string>();
  const maxAttempts = count * 50;
  for (let attempt = 0; attempt < maxAttempts && words.size < count; attempt++) {
    const syllables =
      settings.minSyllables + Math.floor(rng() * (settings.maxSyllables - settings.minSyllables + 1));
    let word = "";
    for (let i = 0; i < syllables; i++) {
      word += render(patterns[pick(patterns.length, settings.dropoff, rng)], cats, settings.dropoff, rng);
    }
    if (!word || exclude.has(word) || forbidden.some((f) => word.includes(f))) continue;
    words.add(word);
  }
  return [...words];
}

/** Starting settings built from a language's inventory. */
export function defaultSettings(phonemes: { ipa: string; kind: "CONSONANT" | "VOWEL" }[]): GeneratorSettings {
  const consonants = phonemes.filter((p) => p.kind === "CONSONANT").map((p) => p.ipa);
  const vowels = phonemes.filter((p) => p.kind === "VOWEL").map((p) => p.ipa);
  return {
    categories: [
      ...(consonants.length ? [{ label: "C", members: consonants }] : []),
      ...(vowels.length ? [{ label: "V", members: vowels }] : []),
    ],
    patterns: consonants.length && vowels.length ? ["CV", "CVC", "V"] : [],
    minSyllables: 1,
    maxSyllables: 3,
    dropoff: true,
    forbidden: [],
  };
}
