import { describe, expect, it } from "vitest";
import { cellKey, soundClasses } from "./inflection";
import { paradigmInput, ruleProblems, storedParadigm } from "./paradigm-input";

const dimensions = [
  { name: "Number", values: ["sg", "pl"] },
  { name: "Case", values: ["nom", "acc"] },
];

describe("paradigmInput", () => {
  it("keeps rules for real cells only, trimmed, without blanks", () => {
    const parsed = paradigmInput.parse({
      name: " Nouns ",
      partOfSpeech: "Noun",
      dimensions,
      rules: { [cellKey(["sg", "nom"])]: " ~ ", [cellKey(["pl", "nom"])]: "  ", [cellKey(["du", "nom"])]: "~i" },
    });
    expect(parsed).toEqual({ name: "Nouns", partOfSpeech: "noun", dimensions, rules: { [cellKey(["sg", "nom"])]: "~" } });
  });

  it("rejects repeated values and too many dimensions", () => {
    const base = { name: "N", partOfSpeech: "noun", rules: {} };
    expect(paradigmInput.safeParse({ ...base, dimensions: [{ name: "Number", values: ["sg", "sg"] }] }).success).toBe(
      false,
    );
    const four = Array.from({ length: 4 }, (_, i) => ({ name: `D${i}`, values: ["x"] }));
    expect(paradigmInput.safeParse({ ...base, dimensions: four }).success).toBe(false);
  });
});

describe("ruleProblems", () => {
  it("names the cell with a bad rule", () => {
    const classes = soundClasses([{ ipa: "a", kind: "VOWEL", spelling: "a" }]);
    expect(ruleProblems(dimensions, { [cellKey(["pl", "acc"])]: "~Q" }, classes)).toEqual([
      "pl acc: There's no sound class Q",
    ]);
  });
});

describe("storedParadigm", () => {
  it("reads JSON columns and drops anything malformed", () => {
    expect(
      storedParadigm({
        dimensions: [{ name: "Number", values: ["sg"] }, { name: "Bad", values: [1] }, null],
        rules: { a: "~", b: 2 },
      }),
    ).toEqual({ dimensions: [{ name: "Number", values: ["sg"] }], rules: { a: "~" } });
    expect(storedParadigm({ dimensions: null, rules: [] })).toEqual({ dimensions: [], rules: {} });
  });
});
