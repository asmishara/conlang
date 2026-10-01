import { describe, expect, it } from "vitest";
import {
  applyRule,
  cellKey,
  cellsOf,
  inflect,
  parseRule,
  shapeProblems,
  soundClasses,
  type SoundClasses,
} from "./inflection";

const classes = soundClasses(
  [
    { ipa: "p", kind: "CONSONANT", spelling: "p" },
    { ipa: "t", kind: "CONSONANT", spelling: "t" },
    { ipa: "k", kind: "CONSONANT", spelling: "k" },
    { ipa: "n", kind: "CONSONANT", spelling: "n" },
    { ipa: "ŋ", kind: "CONSONANT", spelling: "ng" },
    { ipa: "a", kind: "VOWEL", spelling: "a" },
    { ipa: "i", kind: "VOWEL", spelling: "i" },
    { ipa: "aː", kind: "VOWEL", spelling: "â" },
  ],
  [{ label: "N", members: ["n", "ŋ"] }],
);

function run(rule: string, word: string, cls: SoundClasses = classes) {
  const parsed = parseRule(rule, cls);
  if ("error" in parsed) throw new Error(parsed.error);
  return applyRule(parsed.rule, word, cls);
}

describe("soundClasses", () => {
  it("spells the inventory's consonants, vowels and generator categories, longest first", () => {
    expect(classes.get("C")).toEqual(["ng", "p", "t", "k", "n"]);
    expect(classes.get("V")).toEqual(["a", "i", "â"]);
    expect(classes.get("N")).toEqual(["ng", "n"]);
  });
});

describe("applyRule", () => {
  it("adds suffixes, prefixes and circumfixes", () => {
    expect(run("~ka", "tana")).toBe("tanaka");
    expect(run("-ka", "tana")).toBe("tanaka");
    expect(run("ma~", "tana")).toBe("matana");
    expect(run("ma-", "tana")).toBe("matana");
    expect(run("ma~ka", "tana")).toBe("matanaka");
    expect(run("~", "tana")).toBe("tana");
  });

  it("replaces endings and tries alternatives in order", () => {
    expect(run("~a → ~i; ~ → ~ia", "tana")).toBe("tani");
    expect(run("~a → ~i; ~ → ~ia", "pin")).toBe("pinia");
    expect(run("~a -> ~i", "pin")).toBeNull();
    expect(run("~a > -i", "tana")).toBe("tani");
  });

  it("matches sound classes and repeats what they matched", () => {
    expect(run("~V → ~Vn; ~ak", "tana")).toBe("tanan");
    expect(run("~V → ~Vn; ~ak", "ping")).toBe("pingak");
    // "ng" is one consonant, so the vowel before it is what doubles.
    expect(run("~VC → ~VVC", "ping")).toBe("piing");
    expect(run("CV~ → CVCV~", "tana")).toBe("tatana");
    expect(run("~N → ~", "tang")).toBe("ta");
  });

  it("allows a fixed form after an arrow, for suppletion", () => {
    expect(run("~ → pai", "tana")).toBe("pai");
  });
});

describe("parseRule", () => {
  it("treats an empty rule as no form", () => {
    expect(parseRule("  ", classes)).toEqual({ rule: [] });
  });

  it("explains mistakes", () => {
    expect(parseRule("ka", classes)).toEqual({ error: "Use ~ for the word, as in ~ka or ka~" });
    expect(parseRule("~a → ~e → ~i", classes)).toHaveProperty("error");
    expect(parseRule("a → ~e", classes)).toEqual({ error: "“a” needs exactly one ~ for the word" });
    expect(parseRule("~X", classes)).toEqual({ error: "There's no sound class X" });
    expect(parseRule("~ → ~V", classes)).toEqual({ error: "V in “~V” must also appear before the arrow" });
  });
});

describe("inflect", () => {
  it("fills every cell, first dimension slowest", () => {
    const dimensions = [
      { name: "Case", values: ["nom", "acc"] },
      { name: "Number", values: ["sg", "pl"] },
    ];
    expect(cellsOf(dimensions)).toEqual([
      ["nom", "sg"],
      ["nom", "pl"],
      ["acc", "sg"],
      ["acc", "pl"],
    ]);
    const cells = inflect(
      "tana",
      {
        dimensions,
        rules: {
          [cellKey(["nom", "sg"])]: "~",
          [cellKey(["nom", "pl"])]: "~i",
          [cellKey(["acc", "sg"])]: "~Q",
        },
      },
      classes,
    );
    expect(cells.map((c) => c.form)).toEqual(["tana", "tanai", null, null]);
    expect(cells[2].error).toBe("There's no sound class Q");
  });
});

describe("shapeProblems", () => {
  it("accepts a good layout and names each problem", () => {
    expect(shapeProblems([{ name: "Number", values: ["sg", "pl"] }])).toEqual([]);
    expect(
      shapeProblems([
        { name: " ", values: ["sg", ""] },
        { name: "Case", values: ["nom", "nom "] },
      ]),
    ).toEqual(["Dimension 1 needs a name", "Dimension 1 has an empty value", "Case lists “nom” twice"]);
  });
});
