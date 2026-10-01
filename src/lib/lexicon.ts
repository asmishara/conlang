import { alphabetComparator, pronounce, readSpelling, type SpellingRule } from "./orthography";
import { wordProblems, type Checker } from "./phonotactics";

type WordRow = { form: string; pronunciation: string | null; partOfSpeech?: string | null };

/**
 * Letters the spelling rules don't cover, e.g. a typo or a missing sound.
 * Spaces and the hyphens of affixes and compounds don't count.
 */
export function unknownLetters(form: string, rules: SpellingRule[]): string[] {
  if (rules.length === 0) return [];
  const unknown = readSpelling(form, rules).filter((s) => !s.known && s.spelling.trim() && s.spelling !== "-");
  return [...new Set(unknown.map((s) => s.spelling))];
}

/**
 * Adds the displayed pronunciation, spelling check and phonotactics check to
 * each word, sorted in the language's alphabet.
 */
export function prepareWords<W extends WordRow>(words: W[], rules: SpellingRule[], check: Checker | null = null) {
  const compare = alphabetComparator(rules);
  return words
    .map((w) => {
      const ipa = w.pronunciation ?? (rules.length ? pronounce(w.form, rules) : null);
      const derived = w.pronunciation === null;
      const unknown = unknownLetters(w.form, rules);
      return {
        ...w,
        ipa,
        derived,
        unknownLetters: unknown,
        problems: wordProblems(check, { ...w, ipa, unreadable: derived && unknown.length > 0 }),
      };
    })
    .sort((a, b) => compare(a.form, b.form));
}
