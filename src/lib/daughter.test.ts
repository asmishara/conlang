import { describe, expect, it } from "vitest";
import { planDaughter, type ParentPhoneme, type ParentWord } from "./daughter";
import { compileSoundChanges, inventoryClasses } from "./sound-changes";

const phonemes: ParentPhoneme[] = [
  { ipa: "p", kind: "CONSONANT", spelling: "p" },
  { ipa: "t", kind: "CONSONANT", spelling: "t" },
  { ipa: "k", kind: "CONSONANT", spelling: "k" },
  { ipa: "ŋ", kind: "CONSONANT", spelling: "ng" },
  { ipa: "h", kind: "CONSONANT", spelling: "h" },
  { ipa: "j", kind: "CONSONANT", spelling: "y" },
  { ipa: "a", kind: "VOWEL", spelling: "a" },
  { ipa: "i", kind: "VOWEL", spelling: "i" },
  { ipa: "aː", kind: "VOWEL", spelling: "â" },
];

function word(id: string, form: string, extra: Partial<ParentWord> = {}): ParentWord {
  return { id, form, pronunciation: null, gloss: `gloss ${id}`, partOfSpeech: "noun", tags: ["t"], ...extra };
}

function plan(rules: string, words: ParentWord[]) {
  const compiled = compileSoundChanges(rules, inventoryClasses(phonemes), phonemes.map((p) => p.ipa));
  return planDaughter("Proto", phonemes, words, compiled);
}

describe("planDaughter", () => {
  it("evolves each word and links it to its source", () => {
    const result = plan("P = p t k\nB = b d g\nP > B / V_V", [word("w1", "pata"), word("w2", "kai", { partOfSpeech: null })]);
    expect(result.words).toEqual([
      {
        form: "pada",
        pronunciation: null,
        gloss: "gloss w1",
        partOfSpeech: "noun",
        tags: ["t"],
        etymology: "From Proto pata /pata/",
        sourceWordId: "w1",
      },
      {
        form: "kai",
        pronunciation: null,
        gloss: "gloss w2",
        partOfSpeech: null,
        tags: ["t"],
        etymology: "From Proto kai /kai/",
        sourceWordId: "w2",
      },
    ]);
    expect(result.lost).toEqual([]);
  });

  it("drops sounds no word has any more and adds new ones, spelled as IPA", () => {
    const result = plan("h > ∅\naː > oː\nt > d / _V", [word("w1", "hâta"), word("w2", "hi")]);
    expect(result.phonemes).toEqual([
      { ipa: "p", kind: "CONSONANT", spelling: "p", position: 0 },
      { ipa: "k", kind: "CONSONANT", spelling: "k", position: 1 },
      { ipa: "ŋ", kind: "CONSONANT", spelling: "ng", position: 2 },
      { ipa: "j", kind: "CONSONANT", spelling: "y", position: 3 },
      { ipa: "a", kind: "VOWEL", spelling: "a", position: 4 },
      { ipa: "i", kind: "VOWEL", spelling: "i", position: 5 },
      { ipa: "oː", kind: "VOWEL", spelling: "oː", position: 6 },
      { ipa: "d", kind: "CONSONANT", spelling: "d", position: 7 },
    ]);
    // p, k, ŋ and j weren't in any word, so they stay; h, t and aː are gone.
    expect(result.words.map((w) => [w.form, w.pronunciation])).toEqual([
      ["oːda", null],
      ["i", null],
    ]);
  });

  it("drops a sound that changed everywhere, so its spelling is free", () => {
    const result = plan("ŋ > ng", [word("w1", "anga")]);
    expect(result.words[0]).toMatchObject({ form: "anga", pronunciation: null });
    expect(result.phonemes.map((p) => p.ipa)).toEqual(["p", "t", "k", "h", "j", "a", "i", "aː", "n", "g"]);
  });

  it("stores the pronunciation when the spelling can't say it", () => {
    // ŋ stays in "ang", so n + g in "anga" is spelled "ng", which reads back as ŋ.
    const result = plan("ŋ > ng / _V", [word("w1", "anga"), word("w2", "ang")]);
    expect(result.words.map((w) => [w.form, w.pronunciation])).toEqual([
      ["anga", "anga"],
      ["ang", null],
    ]);
  });

  it("keeps spaces and hyphens and uses the parent's pronunciation", () => {
    const result = plan("a > i / _#", [word("w1", "ka ta"), word("w2", "-ka"), word("w3", "x", { pronunciation: "/ˈpa/" })]);
    expect(result.words.map((w) => [w.form, w.pronunciation, w.etymology])).toEqual([
      ["ki ti", null, "From Proto ka ta /ka ta/"],
      ["-ki", null, "From Proto -ka /-ka/"],
      ["pi", null, "From Proto x /pa/"],
    ]);
  });

  it("leaves out words that lose every sound", () => {
    const result = plan("V > ∅\nC > ∅", [word("w1", "ka"), word("w2", "ta")]);
    expect(result.words).toEqual([]);
    expect(result.lost).toEqual(["ka", "ta"]);
  });

  it("keeps letters the parent had no sound for as they were", () => {
    const result = plan("a > i", [word("w1", "kab")]);
    expect(result.words[0].form).toBe("kib");
    expect(result.phonemes.map((p) => p.ipa)).not.toContain("b");
  });
});
