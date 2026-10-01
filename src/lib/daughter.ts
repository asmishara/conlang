// Making a daughter language: every word of the parent goes through a rule
// set, and the daughter gets an inventory to match the sounds it ends up with.

import { chartSymbols } from "./ipa";
import { pronouncePhrase } from "./orthography";
import { cleanPronunciation, evolve, soundsIn, spellResult, type CompiledChanges } from "./sound-changes";

type Kind = "CONSONANT" | "VOWEL";
export type ParentPhoneme = { ipa: string; kind: Kind; spelling: string };
export type ParentWord = {
  id: string;
  form: string;
  pronunciation: string | null;
  gloss: string;
  partOfSpeech: string | null;
  tags: string[];
};
export type DaughterPlan = {
  phonemes: { ipa: string; kind: Kind; spelling: string; position: number }[];
  words: {
    form: string;
    pronunciation: string | null;
    gloss: string;
    partOfSpeech: string | null;
    tags: string[];
    etymology: string;
    sourceWordId: string;
  }[];
  /** Words left out because the rules took away every sound (or made them too long to store). */
  lost: string[];
};

const MAX_FORM = 100;

/** Whether a sound the chart doesn't list is a vowel, judged by its base letter (oː is a vowel). */
function kindOf(sound: string): Kind {
  const base = String.fromCodePoint(sound.normalize("NFD").codePointAt(0)!);
  return chartSymbols.get(sound) ?? chartSymbols.get(base) ?? "CONSONANT";
}

/**
 * Works out a daughter language. Its inventory keeps the parent's sounds,
 * except ones that were in some word and are now in none, and adds the new
 * sounds the rules brought in, spelled as IPA until the writer changes them.
 * Each word keeps its meaning, part of speech and tags, and remembers the
 * word it came from.
 */
export function planDaughter(
  parentName: string,
  phonemes: ParentPhoneme[],
  words: ParentWord[],
  compiled: CompiledChanges,
): DaughterPlan {
  const parentRules = phonemes.map(({ ipa, spelling }) => ({ ipa, spelling }));
  const inventory = new Set(phonemes.map((p) => p.ipa.normalize("NFC")));

  const evolved = words.map((w) => {
    const before = cleanPronunciation(w.pronunciation ?? pronouncePhrase(w.form, parentRules));
    return { word: w, before, result: evolve(compiled, before).result };
  });

  const usedBefore = new Set<string>();
  const usedAfter = new Set<string>();
  const added = new Set<string>();
  for (const { before, result } of evolved) {
    const old = soundsIn(compiled, before);
    for (const sound of old) usedBefore.add(sound);
    for (const sound of soundsIn(compiled, result)) {
      usedAfter.add(sound);
      // Letters the parent never had a sound for stay as they were.
      if (!inventory.has(sound) && !old.includes(sound)) added.add(sound);
    }
  }

  const kept = phonemes.filter((p) => {
    const ipa = p.ipa.normalize("NFC");
    return !usedBefore.has(ipa) || usedAfter.has(ipa);
  });
  const daughterPhonemes = [
    ...kept.map((p) => ({ ipa: p.ipa, kind: p.kind, spelling: p.spelling })),
    ...[...added].map((sound) => ({ ipa: sound, kind: kindOf(sound), spelling: sound })),
  ].map((p, position) => ({ ...p, position }));
  const daughterRules = daughterPhonemes.map(({ ipa, spelling }) => ({ ipa, spelling }));

  const lost: string[] = [];
  const daughterWords: DaughterPlan["words"] = [];
  for (const { word, before, result } of evolved) {
    const form = spellResult(result, daughterRules).trim();
    if (!form || form.length > MAX_FORM) {
      lost.push(word.form);
      continue;
    }
    // Only store the pronunciation when the spelling doesn't already say it.
    const readsBack = pronouncePhrase(form, daughterRules) === result;
    daughterWords.push({
      form,
      pronunciation: readsBack ? null : result,
      gloss: word.gloss,
      partOfSpeech: word.partOfSpeech,
      tags: word.tags,
      etymology: `From ${parentName} ${word.form} /${before}/`,
      sourceWordId: word.id,
    });
  }
  return { phonemes: daughterPhonemes, words: daughterWords, lost };
}
