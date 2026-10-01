import { describe, expect, it } from "vitest";
import { compileSoundChanges, countRules, evolve, inventoryClasses, type SoundClassMap } from "./sound-changes";

const base: SoundClassMap = new Map([
  ["C", ["p", "t", "k", "b", "d", "g", "s", "h", "m", "n", "r", "t͡ʃ"]],
  ["V", ["a", "e", "i", "o", "u"]],
]);

function run(rules: string, word: string, classes = base) {
  const compiled = compileSoundChanges(rules, classes);
  expect(compiled.problems).toEqual([]);
  return evolve(compiled, word).result;
}

function problems(rules: string) {
  return compileSoundChanges(rules, base).problems;
}

describe("inventoryClasses", () => {
  it("builds C and V from the inventory and adds generator categories", () => {
    const classes = inventoryClasses(
      [
        { ipa: "p", kind: "CONSONANT" },
        { ipa: "a", kind: "VOWEL" },
        { ipa: "n", kind: "CONSONANT" },
      ],
      [
        { label: "N", members: ["n"] },
        { label: "Lq", members: ["l"] },
      ],
    );
    expect([...classes]).toEqual([
      ["C", ["p", "n"]],
      ["V", ["a"]],
      ["N", ["n"]],
    ]);
  });
});

describe("evolve", () => {
  it("changes a sound everywhere", () => {
    expect(run("p > f", "papa")).toBe("fafa");
    expect(run("p → f", "papa")).toBe("fafa");
    expect(run("p -> f", "papa")).toBe("fafa");
  });

  it("maps lists in order, only where the place fits", () => {
    expect(run("p t k > b d g / V_V", "apatak")).toBe("abadak");
  });

  it("maps one class onto another of the same size", () => {
    expect(run("P = p t k\nB = b d g\nP > B / V_V", "apatak")).toBe("abadak");
  });

  it("repeats the matched sound when the result uses the same class", () => {
    expect(run("V > Vː / _#", "kata")).toBe("kataː");
    expect(run("C > CC / V_V", "kata")).toBe("katta");
  });

  it("deletes and inserts", () => {
    expect(run("h > ∅ / _#", "pah")).toBe("pa");
    expect(run("h > / _#", "pah")).toBe("pa");
    expect(run("∅ > e / #_sC", "sta")).toBe("esta");
    expect(run("∅ > e / #_sC", "sa")).toBe("sa");
  });

  it("changes sequences of sounds", () => {
    expect(run("ai > e", "kai")).toBe("ke");
    expect(run("ai au > e o", "kaitau")).toBe("keto");
  });

  it("applies each rule to the whole word at once", () => {
    // Both a's between consonants go, judged on the word before the rule.
    expect(run("a > ∅ / C_C", "katapa")).toBe("ktpa");
    // A chain shift doesn't feed itself.
    expect(run("a e > e i", "ae")).toBe("ei");
  });

  it("applies rules in order", () => {
    expect(run("a > e\ne > i", "ka")).toBe("ki");
    expect(run("e > i\na > e", "ka")).toBe("ke");
  });

  it("respects word edges", () => {
    expect(run("s > h / #_", "sasa")).toBe("hasa");
    expect(run("s > h / _#", "sasas")).toBe("sasah");
    expect(run("s > h / #_, _#", "sasas")).toBe("hasah");
  });

  it("supports optional parts", () => {
    expect(run("s > ∅ / _(C)#", "kas")).toBe("ka");
    expect(run("s > ∅ / _(C)#", "kast")).toBe("kat");
    expect(run("s > ∅ / _(C)#", "kasta")).toBe("kasta");
    expect(run("n > m / (V)_p", "anpa")).toBe("ampa");
  });

  it("skips exceptions", () => {
    expect(run("s > z / V_V // _i", "asa")).toBe("aza");
    expect(run("s > z / V_V // _i", "asi")).toBe("asi");
    expect(run("k > t͡ʃ // _a", "kika")).toBe("t͡ʃika");
  });

  it("treats inventory sounds and diacritics as single sounds", () => {
    expect(run("t > d", "t͡ʃata")).toBe("t͡ʃada");
    expect(run("t > d", "tʰata")).toBe("tʰada");
    expect(run("Vː > V", "kaːta")).toBe("kata");
    expect(run("V > ∅ / C_C", "kaːtat")).toBe("kaːtt");
  });

  it("lets a class carry a diacritic, even when Unicode composes it", () => {
    // "V" plus a combining tilde is stored as the single letter Ṽ.
    expect(run("N = m n\nV > V\u0303 / _N", "kan")).toBe("k\u00e3n");
    expect(run("V\u0303 > V", "k\u00e3n")).toBe("kan");
    expect(run("V\u0303 > V", "kan")).toBe("kan");
  });

  it("re-reads the word between rules", () => {
    expect(run("k > ts / _i\nts > s", "ki")).toBe("si");
    expect(run("D = ts\nk > t / _i\n∅ > s / t_i\nD > s", "ki")).toBe("si");
  });

  it("ignores stress and syllable marks, and treats spaces and hyphens as edges", () => {
    expect(run("a > e / _#", "/ˈka.ta/")).toBe("kate");
    expect(run("a > e / _#", "ka ta")).toBe("ke te");
    expect(run("∅ > e / #_", "-ka")).toBe("-eka");
  });

  it("skips notes and blank lines", () => {
    expect(run("# lenition\n\np > f", "pa")).toBe("fa");
  });

  it("lets classes include other classes", () => {
    expect(run("P = p t\nF = f s\nO = P F\nO > h / _#", "kapas")).toBe("kapah");
  });

  it("records the steps that changed the word", () => {
    const compiled = compileSoundChanges("p > b / V_V\n# nothing\nk > x\nb > v", base);
    expect(evolve(compiled, "apa").steps).toEqual([
      { line: 1, rule: "p > b / V_V", before: "apa", after: "aba" },
      { line: 4, rule: "b > v", before: "aba", after: "ava" },
    ]);
  });
});

describe("compileSoundChanges problems", () => {
  it("reports problems by line and skips those lines", () => {
    const compiled = compileSoundChanges("p > f\nX > y\nt > d", base);
    expect(compiled.problems).toEqual([
      { line: 2, message: "There's no class X. Define it on a line of its own first, like X = p t k" },
    ]);
    expect(evolve(compiled, "pat").result).toBe("fad");
  });

  it("explains malformed rules", () => {
    expect(problems("p f")[0].message).toBe("A rule needs an arrow, like p > f");
    expect(problems("p > f > v")[0].message).toBe("A rule has only one arrow");
    expect(problems("> f")[0].message).toBe("Write the sound that changes before the arrow");
    expect(problems("∅ > e")[0].message).toBe("Say where to add the sound, like ∅ > e / #_s");
    expect(problems("p > f / VV")[0].message).toBe("“VV” needs a _ to show where the sound is, like V_V");
    expect(problems("p > f / V_V_")[0].message).toBe("“V_V_” has more than one _");
    expect(problems("p > f / (V_")[0].message).toBe("“(V” has a ( without a )");
    expect(problems("p > f / V)_")[0].message).toBe("“V)” has a ) without a (");
    expect(problems("p# > f")[0].message).toBe("# only goes after the /, where you say where the change happens");
    expect(problems("p t k > b d")[0].message).toBe(
      "There are 3 sounds before the arrow but 2 after it. Give one result, or one for each",
    );
    expect(problems("p > C")[0].message).toBe("C after the arrow needs a class before it to pair up with");
    expect(problems("V > C")[0].message).toBe("V has 5 sounds but C has 12 sounds, so they can't be paired up");
    expect(problems("X = ")[0].message).toBe("X has no sounds");
    expect(problems("X = Y")[0].message).toBe("There's no class Y to include in X");
  });

  it("returns the classes available at the end", () => {
    const { classes } = compileSoundChanges("F = f s", base);
    expect(classes.get("F")).toEqual(["f", "s"]);
    expect(classes.get("V")).toEqual(["a", "e", "i", "o", "u"]);
  });
});

describe("countRules", () => {
  it("counts rule lines only", () => {
    expect(countRules("# notes\nP = p t k\n\np > f\nP => B\n  t > d / V_V")).toBe(3);
  });
});
