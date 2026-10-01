import { describe, expect, it } from "vitest";
import { chartSymbols, consonantPlaces, consonantRows, vowelBackness, vowelRows } from "./ipa";

describe("IPA charts", () => {
  it("has one cell per column in every row", () => {
    for (const row of consonantRows) expect(row.cells).toHaveLength(consonantPlaces.length);
    for (const row of vowelRows) expect(row.cells).toHaveLength(vowelBackness.length);
  });

  it("lists each symbol once", () => {
    const all = [
      ...consonantRows.flatMap((r) => r.cells.flat()),
      ...vowelRows.flatMap((r) => r.cells.flat()),
    ].filter(Boolean);
    expect(new Set(all).size).toBe(all.length);
  });

  it("classifies symbols by chart", () => {
    expect(chartSymbols.get("p")).toBe("CONSONANT");
    expect(chartSymbols.get("t͡ʃ")).toBe("CONSONANT");
    expect(chartSymbols.get("w")).toBe("CONSONANT");
    expect(chartSymbols.get("a")).toBe("VOWEL");
  });
});
