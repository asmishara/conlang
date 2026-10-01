import { describe, expect, it } from "vitest";
import { prepareWords } from "./lexicon";

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
