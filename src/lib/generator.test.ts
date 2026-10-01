import { describe, expect, it } from "vitest";
import { defaultSettings, generateWords, parsePattern, seededRng, validateSettings, type GeneratorSettings } from "./generator";

const base: GeneratorSettings = {
  categories: [
    { label: "C", members: ["p", "t", "k"] },
    { label: "V", members: ["a", "i"] },
    { label: "N", members: ["n"] },
  ],
  patterns: ["CV(N)"],
  minSyllables: 1,
  maxSyllables: 2,
  dropoff: false,
  forbidden: [],
};

describe("parsePattern", () => {
  const labels = new Set(["C", "V"]);

  it("parses categories, literals and nested optionals", () => {
    expect(parsePattern("C(ʔ(V))a", labels)).toEqual({
      nodes: [
        { type: "category", label: "C" },
        { type: "optional", nodes: [{ type: "literal", text: "ʔ" }, { type: "optional", nodes: [{ type: "category", label: "V" }] }] },
        { type: "literal", text: "a" },
      ],
    });
  });

  it("reports unknown categories and unbalanced parentheses", () => {
    expect(parsePattern("CX", labels)).toEqual({ error: '"CX" uses X, but there is no category X' });
    expect(parsePattern("C(V", labels)).toHaveProperty("error");
    expect(parsePattern("CV)", labels)).toHaveProperty("error");
    expect(parsePattern("  ", labels)).toHaveProperty("error");
  });
});

describe("validateSettings", () => {
  it("accepts good settings", () => {
    expect(validateSettings(base)).toEqual([]);
  });

  it("lists every problem", () => {
    const problems = validateSettings({
      ...base,
      categories: [{ label: "c", members: ["p"] }, { label: "V", members: [] }],
      patterns: ["CV"],
      minSyllables: 3,
      maxSyllables: 2,
    });
    expect(problems).toHaveLength(4);
  });
});

describe("generateWords", () => {
  it("only produces words that fit the pattern", () => {
    const words = generateWords(base, 40, seededRng(1));
    expect(words.length).toBeGreaterThan(20);
    for (const w of words) expect(w).toMatch(/^([ptk][ai]n?){1,2}$/);
  });

  it("returns distinct words and is deterministic for a seed", () => {
    const a = generateWords(base, 10, seededRng(42));
    expect(new Set(a).size).toBe(a.length);
    expect(generateWords(base, 10, seededRng(42))).toEqual(a);
  });

  it("skips forbidden sequences and excluded words", () => {
    const words = generateWords({ ...base, forbidden: ["ti"] }, 50, seededRng(3), new Set(["pa"]));
    expect(words.some((w) => w.includes("ti"))).toBe(false);
    expect(words).not.toContain("pa");
  });

  it("stops when the settings can't make enough distinct words", () => {
    const tiny = { ...base, categories: [{ label: "V", members: ["a"] }], patterns: ["V"], maxSyllables: 1 };
    expect(generateWords(tiny, 10, seededRng(1))).toEqual(["a"]);
  });

  it("favours earlier sounds when dropoff is on", () => {
    const s = { ...base, categories: [{ label: "V", members: ["a", "e", "i", "o", "u"] }], patterns: ["V"], minSyllables: 3, maxSyllables: 3, dropoff: true };
    const letters = generateWords(s, 100, seededRng(7)).join("");
    const count = (c: string) => [...letters].filter((x) => x === c).length;
    expect(count("a")).toBeGreaterThan(count("u"));
  });

  it("returns nothing for invalid settings", () => {
    expect(generateWords({ ...base, patterns: ["CX"] }, 5, seededRng(1))).toEqual([]);
  });
});

describe("defaultSettings", () => {
  it("builds C and V from the inventory", () => {
    const s = defaultSettings([
      { ipa: "p", kind: "CONSONANT" },
      { ipa: "a", kind: "VOWEL" },
    ]);
    expect(s.categories).toEqual([
      { label: "C", members: ["p"] },
      { label: "V", members: ["a"] },
    ]);
    expect(validateSettings(s)).toEqual([]);
  });
});
