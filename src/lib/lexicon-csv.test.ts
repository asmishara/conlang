import { describe, expect, it } from "vitest";
import { lexiconToCsv, parseLexiconCsv } from "./lexicon-csv";

describe("parseLexiconCsv", () => {
  it("reads rows using header aliases", () => {
    const csv = 'Word,Meaning,POS,IPA,Tags\ntama,water,Noun,/tama/,"nature, basic"\nkesh,"to run, to flee",verb,,\n';
    const { words, errors } = parseLexiconCsv(csv);
    expect(errors).toEqual([]);
    expect(words).toEqual([
      { form: "tama", gloss: "water", partOfSpeech: "noun", pronunciation: "tama", etymology: null, notes: null, tags: ["nature", "basic"] },
      { form: "kesh", gloss: "to run, to flee", partOfSpeech: "verb", pronunciation: null, etymology: null, notes: null, tags: [] },
    ]);
  });

  it("reports bad rows and keeps the good ones", () => {
    const { words, errors } = parseLexiconCsv("word,gloss\ntama,water\n,orphan\n");
    expect(words).toHaveLength(1);
    expect(errors).toEqual(["Row 3: Word is required"]);
  });

  it("requires word and gloss columns", () => {
    expect(parseLexiconCsv("word,notes\ntama,x\n").errors[0]).toMatch(/header/);
  });

  it("round-trips its own export", () => {
    const csv = lexiconToCsv([
      { form: "tama", pronunciation: "tama", partOfSpeech: "noun", gloss: 'water, "wet"', etymology: null, notes: "line1\nline2", tags: ["a", "b"] },
    ]);
    const { words, errors } = parseLexiconCsv(csv);
    expect(errors).toEqual([]);
    expect(words[0]).toMatchObject({ form: "tama", gloss: 'water, "wet"', notes: "line1\nline2", tags: ["a", "b"] });
  });

  it("neutralizes spreadsheet formulas on export", () => {
    const csv = lexiconToCsv([
      { form: "=1+1", pronunciation: "", partOfSpeech: null, gloss: "x", etymology: null, notes: null, tags: [] },
    ]);
    expect(csv).toContain("'=1+1");
  });
});
