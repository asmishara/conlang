import { describe, expect, it } from "vitest";
import { parseTags, parseWordForm } from "./word-input";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseWordForm", () => {
  it("requires a word and a meaning", () => {
    expect(parseWordForm(form({ form: "ta", gloss: "" })).success).toBe(false);
    expect(parseWordForm(form({ form: " ", gloss: "water" })).success).toBe(false);
  });

  it("cleans optional fields", () => {
    const result = parseWordForm(
      form({ form: " tama ", gloss: "water", pronunciation: "/tama/", partOfSpeech: "Noun", tags: "Nature, food,nature" }),
    );
    expect(result.data).toEqual({
      form: "tama",
      gloss: "water",
      pronunciation: "tama",
      partOfSpeech: "noun",
      etymology: null,
      notes: null,
      tags: ["nature", "food"],
    });
  });

  it("treats a blank pronunciation as derived", () => {
    expect(parseWordForm(form({ form: "ta", gloss: "x", pronunciation: " // " })).data?.pronunciation).toBeNull();
  });
});

describe("parseTags", () => {
  it("dedupes, lowercases and drops empties", () => {
    expect(parseTags("A; b,, a ,")).toEqual(["a", "b"]);
  });
});
