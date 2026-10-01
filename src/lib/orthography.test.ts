import { describe, expect, it } from "vitest";
import { segment, spell } from "./orthography";

const rules = [
  { ipa: "t", spelling: "t" },
  { ipa: "t͡ʃ", spelling: "ch" },
  { ipa: "ʃ", spelling: "sh" },
  { ipa: "a", spelling: "a" },
  { ipa: "aː", spelling: "â" },
  { ipa: "ŋ", spelling: "ng" },
];

describe("spell", () => {
  it("maps each phoneme to its spelling", () => {
    expect(spell("ʃaŋ", rules)).toBe("shang");
  });

  it("prefers the longest matching phoneme", () => {
    expect(spell("t͡ʃaːt", rules)).toBe("chât");
  });

  it("ignores slashes, brackets and spaces around the transcription", () => {
    expect(spell("/t͡ʃa ŋ/", rules)).toBe("chang");
    expect(spell("[ta]", rules)).toBe("ta");
  });

  it("passes unknown sounds through unchanged", () => {
    expect(spell("tox", rules)).toBe("tox");
  });
});

describe("segment", () => {
  it("flags sounds outside the inventory", () => {
    expect(segment("tox", rules)).toEqual([
      { ipa: "t", spelling: "t", known: true },
      { ipa: "o", spelling: "o", known: false },
      { ipa: "x", spelling: "x", known: false },
    ]);
  });

  it("keeps a combining mark with its base character", () => {
    const segs = segment("ã", rules);
    expect(segs).toHaveLength(1);
    expect(segs[0]).toMatchObject({ known: false });
  });

  it("matches decomposed input against precomposed rules", () => {
    expect(spell("â", [{ ipa: "â", spelling: "A" }])).toBe("A");
  });
});
