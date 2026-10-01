import { describe, expect, it } from "vitest";
import { cellKey, inflect, soundClasses } from "./inflection";
import {
  cleanIrregularForms,
  moveIrregularForms,
  paradigmInput,
  ruleProblems,
  storedParadigm,
} from "./paradigm-input";

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

describe("cleanIrregularForms", () => {
  const classes = soundClasses([{ ipa: "a", kind: "VOWEL", spelling: "a" }]);
  const cells = inflect(
    "tana",
    { dimensions: [{ name: "Number", values: ["sg", "pl", "du"] }], rules: { [cellKey(["sg"])]: "~", [cellKey(["pl"])]: "~i" } },
    classes,
  );

  it("keeps real changes, reads a dash as no form, and drops the rest", () => {
    expect(
      cleanIrregularForms(
        { [cellKey(["sg"])]: " tana ", [cellKey(["pl"])]: "—", [cellKey(["du"])]: "", [cellKey(["xx"])]: "x" },
        cells,
      ),
    ).toEqual({ [cellKey(["pl"])]: "" });
    expect(cleanIrregularForms({ [cellKey(["du"])]: "tanau", [cellKey(["sg"])]: "tan" }, cells)).toEqual({
      [cellKey(["sg"])]: "tan",
      [cellKey(["du"])]: "tanau",
    });
    // A dash where the rule gives no form anyway isn't irregular.
    expect(cleanIrregularForms({ [cellKey(["du"])]: "-" }, cells)).toEqual({});
  });

  it("rejects malformed input", () => {
    expect(cleanIrregularForms("nope", cells)).toBeNull();
    expect(cleanIrregularForms({ [cellKey(["sg"])]: "x".repeat(101) }, cells)).toBeNull();
  });
});

describe("moveIrregularForms", () => {
  const forms = [
    { wordId: "w", cell: cellKey(["sg", "nom"]) },
    { wordId: "w", cell: cellKey(["pl", "nom"]) },
    { wordId: "w", cell: cellKey(["pl", "acc"]) },
  ];

  it("follows renamed cells and drops removed ones", () => {
    const after = [
      { name: "Number", values: ["singular", "plural"] },
      { name: "Case", values: ["nom"] },
    ];
    const moves = { [cellKey(["sg", "nom"])]: cellKey(["singular", "nom"]), [cellKey(["pl", "nom"])]: cellKey(["plural", "nom"]) };
    expect(moveIrregularForms(forms, after, moves).map((f) => f.cell)).toEqual([
      cellKey(["singular", "nom"]),
      cellKey(["plural", "nom"]),
    ]);
  });

  it("keeps forms in cells that still exist when there are no moves", () => {
    expect(moveIrregularForms(forms, [dimensions[0], { name: "Case", values: ["nom"] }]).map((f) => f.cell)).toEqual([
      cellKey(["sg", "nom"]),
      cellKey(["pl", "nom"]),
    ]);
  });
});
