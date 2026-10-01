import { describe, expect, it } from "vitest";
import { inventoryInput } from "./inventory-input";

describe("inventoryInput", () => {
  it("defaults a blank spelling to the IPA symbol", () => {
    const result = inventoryInput.parse([{ ipa: "ʃ", kind: "CONSONANT", spelling: " " }]);
    expect(result).toEqual([{ ipa: "ʃ", kind: "CONSONANT", spelling: "ʃ" }]);
  });

  it("rejects duplicate sounds, including differently normalized ones", () => {
    const result = inventoryInput.safeParse([
      { ipa: "â", kind: "VOWEL", spelling: "" },
      { ipa: "â", kind: "VOWEL", spelling: "" },
    ]);
    expect(result.success).toBe(false);
  });

  it("rejects an empty symbol", () => {
    expect(inventoryInput.safeParse([{ ipa: "", kind: "VOWEL", spelling: "a" }]).success).toBe(false);
  });

  it("rejects unknown kinds", () => {
    expect(inventoryInput.safeParse([{ ipa: "a", kind: "TONE", spelling: "a" }]).success).toBe(false);
  });
});
