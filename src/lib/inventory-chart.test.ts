import { describe, expect, it } from "vitest";
import { consonantChart, vowelChart } from "./inventory-chart";

describe("consonantChart", () => {
  it("keeps only the rows and columns the language uses", () => {
    const chart = consonantChart(["p", "t", "m", "n", "t͡ʃ", "kʷ"]);
    expect(chart.columns).toEqual(["Bilabial", "Alveolar", "Postalveolar"]);
    expect(chart.rows).toEqual([
      { label: "Plosive", cells: [["p"], ["t"], []] },
      { label: "Nasal", cells: [["m"], ["n"], []] },
      { label: "Affricate", cells: [[], [], ["t͡ʃ"]] },
    ]);
    expect(chart.others).toEqual(["kʷ"]);
  });

  it("is empty without consonants", () => {
    expect(consonantChart([])).toEqual({ columns: [], rows: [], others: [] });
  });
});

describe("vowelChart", () => {
  it("lays out vowels and lists long vowels separately", () => {
    const chart = vowelChart(["i", "u", "a", "aː"]);
    expect(chart.columns).toEqual(["Front", "Back"]);
    expect(chart.rows).toEqual([
      { label: "Close", cells: [["i"], ["u"]] },
      { label: "Open", cells: [["a"], []] },
    ]);
    expect(chart.others).toEqual(["aː"]);
  });
});
