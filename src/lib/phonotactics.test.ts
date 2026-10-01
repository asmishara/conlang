import { describe, expect, it } from "vitest";
import { compilePhonotactics, describeProblem, phonotacticsOf, wordProblems, type Phonotactics } from "./phonotactics";

const base: Phonotactics = {
  categories: [
    { label: "C", members: ["p", "t", "k", "n", "t͡ʃ"] },
    { label: "V", members: ["a", "i", "aː"] },
    { label: "N", members: ["n", "ŋ"] },
    { label: "X", members: ["ʔ"] },
  ],
  patterns: ["CV(N)", "sCV"],
  forbidden: ["ti"],
};
const check = compilePhonotactics(base)!;

describe("compilePhonotactics", () => {
  it("accepts words that split into pattern syllables", () => {
    for (const w of ["pa", "kanpi", "t͡ʃaːŋ", "stapaŋ", "ka.ˈpan", "/kapa/", "kapa kina", "kapa-kina"]) {
      expect(check(w), w).toEqual([]);
    }
  });

  it("backtracks when a sound could close one syllable or open the next", () => {
    // "kanapa" must split ka.na.pa, not kan.a.pa.
    expect(check("kanapa")).toEqual([]);
  });

  it("names sounds no pattern allows, including unused categories", () => {
    expect(check("kaʃa")).toEqual([{ kind: "sounds", sounds: ["ʃ"] }]);
    expect(check("kaʔa")).toEqual([{ kind: "sounds", sounds: ["ʔ"] }]);
  });

  it("says where the syllables stop fitting", () => {
    expect(check("kat")).toEqual([{ kind: "syllables", fitted: "ka", rest: "t" }]);
    expect(check("apa")).toEqual([{ kind: "syllables", fitted: "", rest: "apa" }]);
    expect(check("kanŋa")).toEqual([{ kind: "syllables", fitted: "kan", rest: "ŋa" }]);
  });

  it("flags forbidden sequences, once each", () => {
    expect(check("tiku tita")).toEqual([
      { kind: "forbidden", sequence: "ti" },
      { kind: "sounds", sounds: ["u"] },
    ]);
  });

  it("returns null for patterns it can't use", () => {
    expect(compilePhonotactics({ ...base, patterns: [] })).toBeNull();
    expect(compilePhonotactics({ ...base, patterns: ["CZ"] })).toBeNull();
  });
});

describe("wordProblems", () => {
  it("skips affixes, unreadable spellings and missing pronunciations", () => {
    expect(wordProblems(check, { form: "-t", ipa: "t" })).toEqual([]);
    expect(wordProblems(check, { form: "t-", ipa: "t" })).toEqual([]);
    expect(wordProblems(check, { form: "t", ipa: "t", partOfSpeech: "affix" })).toEqual([]);
    expect(wordProblems(check, { form: "qa", ipa: "qa", unreadable: true })).toEqual([]);
    expect(wordProblems(check, { form: "x", ipa: null })).toEqual([]);
    expect(wordProblems(null, { form: "t", ipa: "t" })).toEqual([]);
    expect(wordProblems(check, { form: "t", ipa: "t" })).toHaveLength(1);
  });
});

describe("phonotacticsOf", () => {
  it("reads saved settings and ignores malformed categories", () => {
    expect(phonotacticsOf(null)).toBeNull();
    expect(
      phonotacticsOf({ categories: [{ label: "C", members: ["p"] }, { nope: 1 }], patterns: ["C"], forbidden: [] }),
    ).toEqual({ categories: [{ label: "C", members: ["p"] }], patterns: ["C"], forbidden: [] });
  });
});

describe("describeProblem", () => {
  it("writes sentences", () => {
    expect(describeProblem({ kind: "forbidden", sequence: "ti" })).toBe("Contains “ti”, which is a forbidden sequence");
    expect(describeProblem({ kind: "sounds", sounds: ["ʃ", "ʒ", "x"] })).toBe(
      "Has “ʃ”, “ʒ” and “x”, which no syllable pattern allows",
    );
    expect(describeProblem({ kind: "syllables", fitted: "ka", rest: "t" })).toBe(
      "No syllable pattern fits “t” after “ka”",
    );
    expect(describeProblem({ kind: "syllables", fitted: "", rest: "apa" })).toBe(
      "No syllable pattern fits the start of “apa”",
    );
  });
});
