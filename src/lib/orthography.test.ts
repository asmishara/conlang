import { describe, expect, it } from "vitest";
import { alphabetComparator, pronounce, readSpelling, segment, spell } from "./orthography";

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
    expect(spell("a\u0302", [{ ipa: "\u00e2", spelling: "A" }])).toBe("A");
  });
});

describe("readSpelling / pronounce", () => {
  it("reads digraphs as one sound", () => {
    expect(pronounce("chang", rules)).toBe("t͡ʃaŋ");
    expect(pronounce("shâ", rules)).toBe("ʃaː");
  });

  it("matches case-insensitively when no exact rule exists", () => {
    expect(pronounce("Chang", rules)).toBe("t͡ʃaŋ");
  });

  it("prefers an exact-case rule when the language distinguishes case", () => {
    const klingonish = [
      { ipa: "q", spelling: "q" },
      { ipa: "q͡χ", spelling: "Q" },
      { ipa: "a", spelling: "a" },
    ];
    expect(pronounce("Qaq", klingonish)).toBe("q͡χaq");
  });

  it("keeps unknown letters and skips spaces", () => {
    expect(readSpelling("tax", rules).map((s) => s.known)).toEqual([true, true, false]);
    expect(pronounce("ta ta", rules)).toBe("tata");
  });
});

describe("alphabetComparator", () => {
  const alphabet = [
    { ipa: "a", spelling: "a" },
    { ipa: "n", spelling: "n" },
    { ipa: "ŋ", spelling: "ng" },
    { ipa: "z", spelling: "z" },
  ];
  const compare = alphabetComparator(alphabet);

  it("treats a digraph as its own letter after its first character", () => {
    expect(["nga", "nza", "na", "a"].sort(compare)).toEqual(["a", "na", "nza", "nga"]);
  });

  it("puts shorter prefixes first and ignores case", () => {
    expect(["Nan", "na", "an"].sort(compare)).toEqual(["an", "na", "Nan"]);
  });

  it("sorts letters outside the alphabet after known ones", () => {
    expect(["xa", "za", "aa"].sort(compare)).toEqual(["aa", "za", "xa"]);
  });
});
