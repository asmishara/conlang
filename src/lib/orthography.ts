export type SpellingRule = { ipa: string; spelling: string };

export type Segment = { ipa: string; spelling: string; known: boolean };

/**
 * Splits a phonemic transcription into the inventory's phonemes, preferring
 * the longest match at each position (so /t͡ʃ/ wins over /t/). Characters that
 * match no phoneme come back as single unknown segments, and whitespace and
 * slashes or brackets around the transcription are ignored.
 */
export function segment(transcription: string, rules: SpellingRule[]): Segment[] {
  const input = transcription.normalize("NFC").replace(/[\s/[\]]/g, "");
  const byLength = [...rules]
    .map((r) => ({ ...r, ipa: r.ipa.normalize("NFC") }))
    .filter((r) => r.ipa.length > 0)
    .sort((a, b) => b.ipa.length - a.ipa.length);

  const out: Segment[] = [];
  let i = 0;
  while (i < input.length) {
    const match = byLength.find((r) => input.startsWith(r.ipa, i));
    if (match) {
      out.push({ ipa: match.ipa, spelling: match.spelling, known: true });
      i += match.ipa.length;
    } else {
      // Step over a whole code point (plus any combining marks) as one unknown.
      const ch = input.slice(i).match(/^[\s\S][\u0300-\u036f]*/u)![0];
      out.push({ ipa: ch, spelling: ch, known: false });
      i += ch.length;
    }
  }
  return out;
}

/** Spells a phonemic transcription using the inventory's spelling rules. */
export function spell(transcription: string, rules: SpellingRule[]): string {
  return segment(transcription, rules)
    .map((s) => s.spelling)
    .join("");
}

/**
 * Reads a written word back into the inventory's phonemes, preferring the
 * longest spelling at each position. Matching is exact first, then
 * case-insensitive, so a language can still distinguish "q" from "Q" when
 * its spelling rules do. Letters no rule covers come back as unknown.
 */
export function readSpelling(word: string, rules: SpellingRule[]): Segment[] {
  const input = word.normalize("NFC").trim();
  const bySpelling = rules
    .map((r) => ({ ipa: r.ipa.normalize("NFC"), spelling: r.spelling.normalize("NFC") }))
    .filter((r) => r.spelling.length > 0)
    .sort((a, b) => b.spelling.length - a.spelling.length);

  const out: Segment[] = [];
  let i = 0;
  while (i < input.length) {
    const rest = input.slice(i);
    const match =
      bySpelling.find((r) => rest.startsWith(r.spelling)) ??
      bySpelling.find((r) => rest.toLowerCase().startsWith(r.spelling.toLowerCase()));
    if (match) {
      out.push({ ipa: match.ipa, spelling: rest.slice(0, match.spelling.length), known: true });
      i += match.spelling.length;
    } else {
      const ch = rest.match(/^[\s\S][\u0300-\u036f]*/u)![0];
      out.push({ ipa: ch, spelling: ch, known: false });
      i += ch.length;
    }
  }
  return out;
}

/** Derives a phonemic transcription (without slashes) from a written word. */
export function pronounce(word: string, rules: SpellingRule[]): string {
  return readSpelling(word, rules)
    .filter((s) => s.spelling.trim() !== "")
    .map((s) => s.ipa)
    .join("");
}

/** Like pronounce, but keeps the spaces between the words of a phrase. */
export function pronouncePhrase(text: string, rules: SpellingRule[]): string {
  return text
    .trim()
    .split(/\s+/)
    .map((word) => pronounce(word, rules))
    .join(" ");
}

/**
 * Builds a comparator that sorts words in the language's alphabet: letters
 * are its spellings in order (so a digraph like "ng" is one letter that
 * comes after "n"), and anything else sorts after them by Unicode order.
 */
export function alphabetComparator(rules: SpellingRule[]) {
  const letters = [...new Set(rules.map((r) => r.spelling.normalize("NFC").toLowerCase()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );
  const rank = new Map(letters.map((l, i) => [l, i]));
  const lowerRules = letters.map((l) => ({ ipa: l, spelling: l }));

  const keyCache = new Map<string, (number | string)[]>();
  function key(word: string) {
    let k = keyCache.get(word);
    if (!k) {
      k = readSpelling(word.toLowerCase(), lowerRules)
        .filter((s) => s.spelling.trim() !== "")
        .map((s) => (s.known ? rank.get(s.ipa)! : s.spelling));
      keyCache.set(word, k);
    }
    return k;
  }

  return (a: string, b: string): number => {
    const ka = key(a);
    const kb = key(b);
    for (let i = 0; i < Math.min(ka.length, kb.length); i++) {
      const x = ka[i];
      const y = kb[i];
      if (x === y) continue;
      if (typeof x === "number" && typeof y === "number") return x - y;
      if (typeof x === "number") return -1;
      if (typeof y === "number") return 1;
      return x < y ? -1 : 1;
    }
    return ka.length - kb.length || a.localeCompare(b);
  };
}
