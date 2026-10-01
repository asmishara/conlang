import { describe, expect, it } from "vitest";
import { prepareWords } from "./lexicon";
import { compilePhonotactics } from "./phonotactics";

const rules = [
  { ipa: "t", spelling: "t" },
  { ipa: "a", spelling: "a" },
  { ipa: "ŋ", spelling: "ng" },
  { ipa: "n", spelling: "n" },
];

describe("prepareWords", () => {
  it("derives missing pronunciations, sorts, and flags unknown letters", () => {
    const words = prepareWords(
      [
        { form: "nga", pronunciation: null },
        { form: "tax", pronunciation: null },
        { form: "na", pronunciation: "nɑ" },
      ],
      rules,
    );
    expect(words.map((w) => [w.form, w.ipa, w.derived, w.unknownLetters])).toEqual([
      ["na", "nɑ", false, []],
      ["nga", "ŋa", true, []],
      ["tax", "tax", true, ["x"]],
    ]);
  });

  it("leaves pronunciation empty and skips checks without spelling rules", () => {
    const [w] = prepareWords([{ form: "xyz", pronunciation: null }], []);
    expect(w).toMatchObject({ ipa: null, unknownLetters: [] });
  });
});

describe("prepareWords with phonotactics", () => {
  const check = compilePhonotactics({
    categories: [
      { label: "C", members: ["t", "n", "ŋ"] },
      { label: "V", members: ["a"] },
    ],
    patterns: ["CV"],
    forbidden: [],
  });

  it("checks the pronunciation people see", () => {
    const words = prepareWords(
      [
        { form: "nga", pronunciation: null },
        { form: "tant", pronunciation: null },
        { form: "na", pronunciation: "nɑ" },
        { form: "tax", pronunciation: null },
        { form: "-n", pronunciation: null, partOfSpeech: "affix" },
      ],
      rules,
      check,
    );
    expect(Object.fromEntries(words.map((w) => [w.form, w.problems]))).toEqual({
      "-n": [],
      na: [{ kind: "sounds", sounds: ["ɑ"] }],
      nga: [],
      tant: [{ kind: "syllables", fitted: "ta", rest: "nt" }],
      // Already flagged for the unknown letter "x".
      tax: [],
    });
    expect(words.find((w) => w.form === "-n")?.unknownLetters).toEqual([]);
  });
});
