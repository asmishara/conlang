// Sound changes, one per line, written the way historical linguists do:
//
//   p t k > b d g / V_V   between vowels, p t k become b d g (in order)
//   h > ∅ / _#            h is lost at the end of a word (# is the edge)
//   ∅ > e / #_sC          e is added before s and a consonant at the start
//   ai > e                a sequence of sounds can change as one
//   s > z / V_V // _i     after "//" come exceptions: not before i
//   s > h / #_, _#        several places, separated by commas
//   n > ŋ / _(V)k         parentheses mark something optional
//   P = p t k             defines a class; C and V come from the inventory
//
// Capital letters are classes. In the result, a class takes the sound in
// the same position of the class it replaces (P > B), or repeats the sound
// it matched (V > Vː). Each rule changes every place in the word at once,
// and the rules apply in order, each to the output of the one before.
// Lines starting with # are notes.

import type { Category } from "./generator";
import { spell, type SpellingRule } from "./orthography";

/** Each class letter and the sounds (IPA) it stands for, in order. */
export type SoundClassMap = Map<string, string[]>;

type Sound = { kind: "sound"; sound: string };
type ClassRef = { kind: "class"; name: string; members: string[]; marks: string; index: Map<string, number> };
type Unit = Sound | ClassRef;
type Piece = Unit | { kind: "edge" } | { kind: "optional"; pieces: Piece[] };
/** `before` is stored back to front, since it is matched walking left from the sound. */
type Place = { before: Piece[]; after: Piece[] };
type Out = Sound | { kind: "class"; members: string[]; marks: string; from: number };
type Change = { target: Unit[]; result: Out[] };

export type SoundChange = { line: number; text: string; changes: Change[]; where: Place[]; except: Place[] };
export type RuleProblem = { line: number; message: string };
export type CompiledChanges = {
  changes: SoundChange[];
  problems: RuleProblem[];
  /** The classes available at the end of the list, for showing to the writer. */
  classes: SoundClassMap;
  /** Splits a stretch of IPA into sounds. */
  split: (text: string) => string[];
};
export type Step = { line: number; rule: string; before: string; after: string };

const ARROW = /\s*(?:→|->|=>|>)\s*/;
const NOTHING = /^(?:∅|Ø|0)$/;
const CLASS_LINE = /^([A-Z])\s*=(?!>)\s*(.*)$/;
// Diacritics and modifier letters (aspiration, length, ejectives, tones)
// belong to the sound before them, and a tie bar joins the next letter too.
const MARK_CHARS = "\\u0300-\\u035b\\u035d-\\u0360\\u0362-\\u036f\\u02b0-\\u02ff\\u1ab0-\\u1aff\\u1d2c-\\u1d6a\\u1dc0-\\u1dff\\u2071\\u207f\\u20d0-\\u20ff\\ufe20-\\ufe2f";
const TRAILING = new RegExp(`^(?:[\\u0361\\u035c][\\s\\S]|[${MARK_CHARS}])*`, "u");
// Slashes, brackets, stress marks, syllable breaks and links between words.
const IGNORED = /[/[\]ˈˌ.‿]/g;

/** C and V from the inventory, plus the word generator's categories, in IPA. */
export function inventoryClasses(
  phonemes: { ipa: string; kind: "CONSONANT" | "VOWEL" }[],
  categories: Category[] = [],
): SoundClassMap {
  const classes: SoundClassMap = new Map();
  const set = (label: string, members: string[]) => {
    const unique = [...new Set(members.map((m) => m.normalize("NFC")).filter(Boolean))];
    if (/^[A-Z]$/.test(label) && unique.length > 0) classes.set(label, unique);
  };
  set("C", phonemes.filter((p) => p.kind === "CONSONANT").map((p) => p.ipa));
  set("V", phonemes.filter((p) => p.kind === "VOWEL").map((p) => p.ipa));
  for (const c of categories) set(c.label, c.members);
  return classes;
}

/** Spells a result with a language's spelling, keeping spaces and hyphens. */
export function spellResult(ipa: string, rules: SpellingRule[]): string {
  return ipa
    .split(/([\s-]+)/)
    .map((part, i) => (i % 2 === 1 ? part : spell(part, rules)))
    .join("");
}

/** The sounds in a result, leaving out spaces and hyphens. */
export function soundsIn(compiled: CompiledChanges, ipa: string): string[] {
  return ipa.split(/[\s-]+/).flatMap((part) => (part ? compiled.split(part) : []));
}

/** Takes a pronunciation as the rules see it: no slashes, stress or syllable marks. */
export function cleanPronunciation(ipa: string): string {
  return ipa.normalize("NFC").replace(IGNORED, "").replace(/\s+/g, " ").trim();
}

/**
 * Splits IPA into sounds, preferring the longest known sound at each
 * position (so /t͡ʃ/ is one sound when the inventory has it). Diacritics
 * stay with the sound they follow, so /tʰ/ is never read as /t/.
 */
function splitter(known: Iterable<string>): (text: string) => string[] {
  const byFirst = new Map<string, string[]>();
  for (const s of new Set([...known].map((k) => k.normalize("NFC")).filter(Boolean))) {
    const first = String.fromCodePoint(s.codePointAt(0)!);
    byFirst.set(first, [...(byFirst.get(first) ?? []), s]);
  }
  for (const list of byFirst.values()) list.sort((a, b) => b.length - a.length);

  return (text) => {
    const out: string[] = [];
    let i = 0;
    while (i < text.length) {
      const first = String.fromCodePoint(text.codePointAt(i)!);
      const head = byFirst.get(first)?.find((s) => text.startsWith(s, i)) ?? first;
      const sound = head + text.slice(i + head.length).match(TRAILING)![0];
      out.push(sound);
      i += sound.length;
    }
    return out;
  };
}

function classRef(name: string, members: string[], marks: string): ClassRef {
  return {
    kind: "class",
    name,
    members,
    marks,
    index: new Map(members.map((m, i) => [(m + marks).normalize("NFC"), i])),
  };
}

/** A class letter, possibly with a diacritic composed onto it (Ṽ). */
function startsClass(ch: string): boolean {
  return /^[A-Z]/.test(ch.normalize("NFD"));
}

/** Reads a run of sounds, classes and (in places) #, ( and ). */
function readPieces(
  text: string,
  classes: SoundClassMap,
  split: (text: string) => string[],
  inPlace: boolean,
): Piece[] | string {
  const stack: Piece[][] = [[]];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];
    const top = stack[stack.length - 1];
    if ((ch === "#" || ch === "(" || ch === ")") && !inPlace) {
      return `${ch} only goes after the /, where you say where the change happens`;
    }
    if (ch === "#") {
      top.push({ kind: "edge" });
      i++;
    } else if (ch === "(") {
      stack.push([]);
      i++;
    } else if (ch === ")") {
      const group = stack.pop()!;
      if (stack.length === 0) return `“${text}” has a ) without a (`;
      if (group.length === 0) return `“${text}” has an empty ()`;
      stack[stack.length - 1].push({ kind: "optional", pieces: group });
      i++;
    } else if (startsClass(ch)) {
      // Unicode composes some letters with diacritics (V + ̃ is Ṽ), so take them apart.
      const [name, ...composed] = ch.normalize("NFD");
      const members = classes.get(name);
      if (!members) return `There's no class ${name}. Define it on a line of its own first, like ${name} = p t k`;
      const trailing = text.slice(i + 1).match(TRAILING)![0];
      top.push(classRef(name, members, composed.join("") + trailing));
      i += 1 + trailing.length;
    } else {
      let j = i;
      while (j < text.length && !/[#()]/.test(text[j]) && !startsClass(text[j])) j++;
      for (const sound of split(text.slice(i, j))) top.push({ kind: "sound", sound });
      i = j;
    }
  }
  if (stack.length > 1) return `“${text}” has a ( without a )`;
  return stack[0];
}

function reversed(pieces: Piece[]): Piece[] {
  return pieces
    .map((p) => (p.kind === "optional" ? { ...p, pieces: reversed(p.pieces) } : p))
    .reverse();
}

function readPlaces(text: string, classes: SoundClassMap, split: (text: string) => string[]): Place[] | string {
  const places: Place[] = [];
  for (const part of text.split(",")) {
    const env = part.replace(/\s+/g, "");
    if (!env) continue;
    const sides = env.split("_");
    if (sides.length !== 2) {
      return sides.length < 2
        ? `“${env}” needs a _ to show where the sound is, like V_V`
        : `“${env}” has more than one _`;
    }
    const before = readPieces(sides[0], classes, split, true);
    if (typeof before === "string") return before;
    const after = readPieces(sides[1], classes, split, true);
    if (typeof after === "string") return after;
    places.push({ before: reversed(before), after });
  }
  return places;
}

function readUnits(text: string, classes: SoundClassMap, split: (text: string) => string[]): Unit[] | string {
  const pieces = readPieces(text, classes, split, false);
  if (typeof pieces === "string") return pieces;
  if (text.includes("_")) return "_ only goes after the /, where you say where the change happens";
  return pieces as Unit[];
}

/** Matches a target's classes and sounds against the word at `start`; returns which member each class matched. */
function matchTarget(target: Unit[], sounds: string[], start: number): number[] | null {
  if (start + target.length > sounds.length) return null;
  const picks: number[] = [];
  for (let k = 0; k < target.length; k++) {
    const unit = target[k];
    const sound = sounds[start + k];
    if (unit.kind === "sound") {
      if (unit.sound !== sound) return null;
    } else {
      const pick = unit.index.get(sound);
      if (pick === undefined) return null;
      picks.push(pick);
    }
  }
  return picks;
}

function matchPieces(
  pieces: Piece[],
  k: number,
  sounds: string[],
  pos: number,
  step: 1 | -1,
  then: (pos: number) => boolean,
): boolean {
  if (k === pieces.length) return then(pos);
  const piece = pieces[k];
  const next = (p: number) => matchPieces(pieces, k + 1, sounds, p, step, then);
  switch (piece.kind) {
    case "edge":
      return (step === 1 ? pos === sounds.length : pos === -1) && next(pos);
    case "optional":
      return matchPieces(piece.pieces, 0, sounds, pos, step, next) || next(pos);
    case "sound":
      return pos >= 0 && pos < sounds.length && sounds[pos] === piece.sound && next(pos + step);
    case "class":
      return pos >= 0 && pos < sounds.length && piece.index.has(sounds[pos]) && next(pos + step);
  }
}

function placeFits(place: Place, sounds: string[], start: number, end: number): boolean {
  return (
    matchPieces(place.before, 0, sounds, start - 1, -1, () => true) &&
    matchPieces(place.after, 0, sounds, end, 1, () => true)
  );
}

function fits(change: SoundChange, sounds: string[], start: number, end: number): boolean {
  return (
    (change.where.length === 0 || change.where.some((p) => placeFits(p, sounds, start, end))) &&
    !change.except.some((p) => placeFits(p, sounds, start, end))
  );
}

function render(result: Out[], picks: number[]): string {
  return result.map((o) => (o.kind === "sound" ? o.sound : o.members[picks[o.from]] + o.marks)).join("");
}

/** Pairs each class in a result with the class it replaces. */
function readResult(units: Unit[], target: Unit[]): Out[] | string {
  const targetClasses = target.filter((u): u is ClassRef => u.kind === "class");
  let k = 0;
  const out: Out[] = [];
  for (const unit of units) {
    if (unit.kind === "sound") {
      out.push(unit);
      continue;
    }
    const from = targetClasses.length === 1 ? 0 : k;
    const source = targetClasses[from];
    k++;
    if (!source) {
      return `${unit.name} after the arrow needs a class before it to pair up with`;
    }
    if (source.members.length !== unit.members.length) {
      const count = (n: number) => `${n} sound${n === 1 ? "" : "s"}`;
      return `${source.name} has ${count(source.members.length)} but ${unit.name} has ${count(unit.members.length)}, so they can't be paired up`;
    }
    out.push({ kind: "class", members: unit.members, marks: unit.marks, from });
  }
  return out;
}

function readRule(
  text: string,
  line: number,
  classes: SoundClassMap,
  split: (text: string) => string[],
): SoundChange | string {
  const sides = text.split(ARROW);
  if (sides.length === 1) return "A rule needs an arrow, like p > f";
  if (sides.length > 2) return "A rule has only one arrow";
  const [left, right] = sides;

  const exceptAt = right.indexOf("//");
  const main = exceptAt === -1 ? right : right.slice(0, exceptAt);
  const exceptText = exceptAt === -1 ? "" : right.slice(exceptAt + 2);
  const slash = main.indexOf("/");
  const resultText = (slash === -1 ? main : main.slice(0, slash)).trim();
  const whereText = slash === -1 ? "" : main.slice(slash + 1);

  const where = readPlaces(whereText, classes, split);
  if (typeof where === "string") return where;
  const except = readPlaces(exceptText, classes, split);
  if (typeof except === "string") return except;

  const targetItems = left.trim().split(/[\s,]+/).filter(Boolean);
  if (targetItems.length === 0) return "Write the sound that changes before the arrow";
  const insertion = targetItems.length === 1 && NOTHING.test(targetItems[0]);
  if (insertion && where.length === 0) return "Say where to add the sound, like ∅ > e / #_s";

  const targets: Unit[][] = [];
  if (insertion) targets.push([]);
  else {
    for (const item of targetItems) {
      if (NOTHING.test(item)) return "∅ before the arrow has to be on its own";
      const units = readUnits(item, classes, split);
      if (typeof units === "string") return units;
      targets.push(units);
    }
  }

  const resultItems = resultText.split(/[\s,]+/).filter(Boolean);
  const results: Unit[][] = [];
  if (resultItems.length === 0 || (resultItems.length === 1 && NOTHING.test(resultItems[0]))) results.push([]);
  else {
    for (const item of resultItems) {
      if (NOTHING.test(item)) results.push([]);
      else {
        const units = readUnits(item, classes, split);
        if (typeof units === "string") return units;
        results.push(units);
      }
    }
  }
  if (results.length !== 1 && results.length !== targets.length) {
    return `There are ${targets.length} sounds before the arrow but ${results.length} after it. Give one result, or one for each`;
  }

  const changes: Change[] = [];
  for (let i = 0; i < targets.length; i++) {
    const result = readResult(results[results.length === 1 ? 0 : i], targets[i]);
    if (typeof result === "string") return result;
    changes.push({ target: targets[i], result });
  }
  return { line, text, changes, where, except };
}

/** The sounds a class line lists, with any classes it names spelled out. */
function defineClass(name: string, text: string, classes: SoundClassMap): string[] | string {
  const members: string[] = [];
  for (const m of text.split(/[\s,]+/).filter(Boolean)) {
    if (/^[A-Z]$/.test(m)) {
      const inner = classes.get(m);
      if (!inner) return `There's no class ${m} to include in ${name}`;
      members.push(...inner);
    } else members.push(m);
  }
  if (members.length === 0) return `${name} has no sounds`;
  return [...new Set(members)];
}

function definedMembers(text: string): string[] {
  return text.split(/[\s,]+/).filter((m) => m && !/^[A-Z]$/.test(m));
}

/** How many lines are rules, leaving out blank lines, notes and class definitions. */
export function countRules(source: string): number {
  return source.split("\n").filter((raw) => {
    const text = raw.trim();
    return text !== "" && !text.startsWith("#") && !CLASS_LINE.test(text);
  }).length;
}

/**
 * Reads a list of sound changes. Lines with problems are reported and
 * skipped. `inventory` lists sounds to treat as single sounds even when no
 * class includes them.
 */
export function compileSoundChanges(source: string, base: SoundClassMap, inventory: string[] = []): CompiledChanges {
  const lines = source.normalize("NFC").split(/\r?\n/);

  // Every sound in the inventory or named in a class is one sound wherever it appears.
  const known = [...inventory, ...[...base.values()].flat()];
  for (const raw of lines) {
    const def = raw.trim().match(CLASS_LINE);
    if (def) known.push(...definedMembers(def[2]));
  }
  const split = splitter(known);

  const classes: SoundClassMap = new Map(base);
  const changes: SoundChange[] = [];
  const problems: RuleProblem[] = [];
  for (const [i, raw] of lines.entries()) {
    const text = raw.trim();
    const line = i + 1;
    if (!text || text.startsWith("#")) continue;

    const def = text.match(CLASS_LINE);
    if (def) {
      const members = defineClass(def[1], def[2], classes);
      if (typeof members === "string") problems.push({ line, message: members });
      else classes.set(def[1], members);
      continue;
    }

    const rule = readRule(text, line, classes, split);
    if (typeof rule === "string") problems.push({ line, message: rule });
    else changes.push(rule);
  }
  return { changes, problems, classes, split };
}

function applyChange(change: SoundChange, sounds: string[]): string {
  const out: string[] = [];
  const insertion = change.changes[0].target.length === 0;
  if (insertion) {
    for (let gap = 0; gap <= sounds.length; gap++) {
      if (fits(change, sounds, gap, gap)) out.push(render(change.changes[0].result, []));
      if (gap < sounds.length) out.push(sounds[gap]);
    }
    return out.join("");
  }
  let i = 0;
  while (i < sounds.length) {
    let changed = false;
    for (const { target, result } of change.changes) {
      const picks = matchTarget(target, sounds, i);
      if (picks && fits(change, sounds, i, i + target.length)) {
        out.push(render(result, picks));
        i += target.length;
        changed = true;
        break;
      }
    }
    if (!changed) out.push(sounds[i++]);
  }
  return out.join("");
}

/** Runs a pronunciation through the rules, keeping each step that changed it. */
export function evolve(compiled: CompiledChanges, pronunciation: string): { result: string; steps: Step[] } {
  let word = cleanPronunciation(pronunciation);
  const steps: Step[] = [];
  for (const change of compiled.changes) {
    // Spaces and hyphens are word edges too.
    const next = word
      .split(/([\s-]+)/)
      .map((part, i) => (i % 2 === 1 || part === "" ? part : applyChange(change, compiled.split(part))))
      .join("")
      .normalize("NFC");
    if (next !== word) {
      steps.push({ line: change.line, rule: change.text, before: word, after: next });
      word = next;
    }
  }
  return { result: word, steps };
}
