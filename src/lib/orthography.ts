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
      const ch = input.slice(i).match(/^.[̀-ͯ]*/u)![0];
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
