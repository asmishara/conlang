import { alphabetComparator, pronounce, readSpelling, type SpellingRule } from "./orthography";

type WordRow = { form: string; pronunciation: string | null };

/** Adds the displayed pronunciation and spelling check to each word, sorted in the language's alphabet. */
export function prepareWords<W extends WordRow>(words: W[], rules: SpellingRule[]) {
  const compare = alphabetComparator(rules);
  return words
    .map((w) => ({
      ...w,
      ipa: w.pronunciation ?? (rules.length ? pronounce(w.form, rules) : null),
      derived: w.pronunciation === null,
      // Letters the spelling rules don't cover, e.g. a typo or a missing sound.
      unknownLetters: rules.length
        ? [...new Set(readSpelling(w.form, rules).filter((s) => !s.known && s.spelling.trim()).map((s) => s.spelling))]
        : [],
    }))
    .sort((a, b) => compare(a.form, b.form));
}
