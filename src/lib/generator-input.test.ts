import { describe, expect, it } from "vitest";
import { generatorInput, splitSymbols } from "./generator-input";

const good = {
  categories: [
    { label: "C", members: ["p", "t"] },
    { label: "V", members: ["a"] },
  ],
  patterns: ["CV"],
  minSyllables: 1,
  maxSyllables: 2,
  dropoff: true,
  forbidden: [],
};

describe("generatorInput", () => {
  it("accepts valid settings", () => {
    expect(generatorInput.safeParse(good).success).toBe(true);
  });

  it("rejects patterns that use undefined categories", () => {
    const result = generatorInput.safeParse({ ...good, patterns: ["CVN"] });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toMatch(/no category N/);
  });

  it("rejects out-of-range syllable counts", () => {
    expect(generatorInput.safeParse({ ...good, maxSyllables: 50 }).success).toBe(false);
  });
});

describe("splitSymbols", () => {
  it("splits on spaces and commas", () => {
    expect(splitSymbols(" p t,k ,, t͡ʃ ")).toEqual(["p", "t", "k", "t͡ʃ"]);
  });
});
