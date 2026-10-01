import { describe, expect, it } from "vitest";
import { parseInterlinear, splitGloss } from "./interlinear";

describe("parseInterlinear", () => {
  it("aligns words by position and pulls out the translation", () => {
    const result = parseInterlinear('tama-ki   nami\nwater-PL  run\n"The waters run."');
    expect(result).toEqual({
      columns: [
        ["tama-ki", "water-PL"],
        ["nami", "run"],
      ],
      tiers: 2,
      translation: "The waters run.",
      warning: null,
    });
  });

  it("supports three tiers and curly quotes", () => {
    const result = parseInterlinear("Tamaki nami\ntama-ki nami\nwater-PL run\n“The waters run.”");
    expect(result.tiers).toBe(3);
    expect(result.columns[0]).toEqual(["Tamaki", "tama-ki", "water-PL"]);
    expect(result.translation).toBe("The waters run.");
  });

  it("works without a translation and warns about uneven lines", () => {
    const result = parseInterlinear("a b c\nx y");
    expect(result.translation).toBeNull();
    expect(result.columns[2]).toEqual(["c", ""]);
    expect(result.warning).toMatch(/3, 2/);
  });

  it("treats a single quoted line as text, not a translation", () => {
    expect(parseInterlinear('"hello"')).toMatchObject({ tiers: 1, translation: null });
  });

  it("handles an empty block", () => {
    expect(parseInterlinear("  \n")).toEqual({ columns: [], tiers: 0, translation: null, warning: null });
  });
});

describe("splitGloss", () => {
  it("marks grammatical abbreviations for small caps", () => {
    expect(splitGloss("water-PL.ACC")).toEqual([
      { text: "water", abbrev: false },
      { text: "-", abbrev: false },
      { text: "pl", abbrev: true },
      { text: ".", abbrev: false },
      { text: "acc", abbrev: true },
    ]);
  });

  it("recognizes person-number abbreviations and leaves plain words alone", () => {
    expect(splitGloss("3SG=see")).toEqual([
      { text: "3sg", abbrev: true },
      { text: "=", abbrev: false },
      { text: "see", abbrev: false },
    ]);
    expect(splitGloss("I")[0].abbrev).toBe(true);
    expect(splitGloss("2")[0].abbrev).toBe(false);
  });
});
