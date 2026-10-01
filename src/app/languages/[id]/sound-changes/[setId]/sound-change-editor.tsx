"use client";

import { Fragment, useDeferredValue, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import type { Category } from "@/lib/generator";
import { chartSymbols } from "@/lib/ipa";
import {
  cleanPronunciation,
  compileSoundChanges,
  evolve,
  inventoryClasses,
  soundsIn,
  spellResult,
  type Step,
} from "@/lib/sound-changes";
import type { CreateState, SaveResult } from "../actions";
import { DaughterForm } from "./daughter-form";

const field = "rounded-md border border-black/15 bg-transparent dark:border-white/20";
const symbolButton = "h-7 min-w-7 rounded px-1 font-ipa text-base leading-none hover:bg-black/10 dark:hover:bg-white/15";
/** At most this many words are listed at once; searching narrows them down. */
const SHOWN = 300;
const NOTATION = ["→", "∅", "/", "_", "#", "//", "(", ")"];
// Shown on a dotted circle when they combine with the letter before them.
const DIACRITICS = ["ː", "ʰ", "ʷ", "ʲ", "ˀ", "̃", "̥", "̩", "̪"];

type Phoneme = { ipa: string; kind: "CONSONANT" | "VOWEL"; spelling: string };
type WordRow = { id: string; form: string; gloss: string; ipa: string };
type SetInput = { name: string; rules: string };

export function SoundChangeEditor({
  languageName,
  initial,
  phonemes,
  categories,
  words,
  save,
  remove,
  makeDaughter,
}: {
  languageName: string;
  initial: SetInput;
  phonemes: Phoneme[];
  categories: Category[];
  words: WordRow[];
  save: (input: SetInput) => Promise<SaveResult>;
  remove: () => Promise<void>;
  makeDaughter: (prev: CreateState, formData: FormData) => Promise<CreateState>;
}) {
  const [name, setName] = useState(initial.name);
  const [rules, setRules] = useState(initial.rules);
  const [saved, setSaved] = useState(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [trial, setTrial] = useState("");
  const [query, setQuery] = useState("");
  const [onlyChanged, setOnlyChanged] = useState(false);
  const [openWord, setOpenWord] = useState<string | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  /** Where the cursor goes once an inserted symbol is on screen. */
  const cursor = useRef<number | null>(null);

  useLayoutEffect(() => {
    if (cursor.current === null) return;
    textarea.current?.focus();
    textarea.current?.setSelectionRange(cursor.current, cursor.current);
    cursor.current = null;
  });

  const base = useMemo(() => inventoryClasses(phonemes, categories), [phonemes, categories]);
  const spelling = useMemo(() => phonemes.map(({ ipa, spelling }) => ({ ipa, spelling })), [phonemes]);
  const inventory = useMemo(() => new Set(phonemes.map((p) => p.ipa.normalize("NFC"))), [phonemes]);
  // Typing stays responsive on a big lexicon; the results catch up.
  const deferredRules = useDeferredValue(rules);
  const compiled = useMemo(
    () => compileSoundChanges(deferredRules, base, [...inventory]),
    [deferredRules, base, inventory],
  );
  const results = useMemo(
    () => words.map((w) => ({ ...w, before: cleanPronunciation(w.ipa), ...evolve(compiled, w.ipa) })),
    [words, compiled],
  );
  // Sounds the rules bring in that the inventory doesn't have yet.
  const newSounds = useMemo(() => {
    const found = new Set<string>();
    for (const r of results) {
      if (r.steps.length === 0) continue;
      const before = new Set(soundsIn(compiled, r.before));
      for (const sound of soundsIn(compiled, r.result)) {
        if (!inventory.has(sound) && !before.has(sound)) found.add(sound);
      }
    }
    return [...found];
  }, [results, compiled, inventory]);

  const dirty = name !== saved.name || rules !== saved.rules;
  const changedCount = results.filter((r) => r.steps.length > 0).length;
  const lostCount = results.filter((r) => r.result.trim() === "").length;
  const q = query.trim().toLowerCase();
  const filtered = results.filter(
    (r) =>
      (!onlyChanged || r.steps.length > 0) &&
      (!q || [r.form, r.gloss, r.before, r.result].some((text) => text.toLowerCase().includes(q))),
  );
  const tried = trial.trim() ? evolve(compiled, trial) : null;
  const moreSymbols = [...chartSymbols.keys()].filter((s) => !inventory.has(s));

  function updateRules(next: string) {
    setStatus(null);
    setRules(next);
  }

  /** Types a symbol at the cursor, since most IPA isn't on a keyboard. */
  function insert(symbol: string) {
    const el = textarea.current;
    // Without a cursor in the rules, add to the end.
    const focused = el !== null && document.activeElement === el;
    const start = focused ? el.selectionStart : rules.length;
    const end = focused ? el.selectionEnd : rules.length;
    cursor.current = start + symbol.length;
    updateRules(rules.slice(0, start) + symbol + rules.slice(end));
  }

  function onSave() {
    const input = { name: name.trim(), rules };
    startSaving(async () => {
      const result = await save(input);
      if (result.ok) {
        setName(input.name);
        setSaved(input);
        setStatus({ ok: true, text: "Saved" });
      } else {
        setStatus({ ok: false, text: result.error });
      }
    });
  }

  const symbol = (s: string) => (
    <button
      key={s}
      type="button"
      title={`Insert ${s.trim()}`}
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => insert(s)}
      className={symbolButton}
    >
      {/^\p{M}/u.test(s) ? `◌${s}` : s}
    </button>
  );

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <label className="block space-y-1 text-sm">
          <span>Name</span>
          <input
            value={name}
            maxLength={100}
            onChange={(e) => {
              setStatus(null);
              setName(e.target.value);
            }}
            className={`${field} block w-full px-3 py-2 text-lg font-semibold`}
          />
        </label>

        <label className="block space-y-1 text-sm">
          <span>Rules, applied from top to bottom</span>
          <textarea
            ref={textarea}
            value={rules}
            onChange={(e) => updateRules(e.target.value)}
            rows={Math.min(24, Math.max(8, rules.split("\n").length + 1))}
            spellCheck={false}
            placeholder={"# Lenition\np t k > b d g / V_V\nh > ∅ / _#"}
            className={`${field} block w-full resize-y px-3 py-2 font-ipa text-base leading-relaxed`}
          />
        </label>

        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-0.5" aria-label="Insert a symbol">
            {NOTATION.map(symbol)}
            <span className="mx-1 h-5 border-l border-black/15 dark:border-white/20" />
            {phonemes.map((p) => symbol(p.ipa))}
            <span className="mx-1 h-5 border-l border-black/15 dark:border-white/20" />
            {DIACRITICS.map(symbol)}
          </div>
          <details className="text-sm">
            <summary className="cursor-pointer opacity-70">More IPA symbols</summary>
            <div className="mt-1 flex flex-wrap gap-0.5">{moreSymbols.map(symbol)}</div>
          </details>
        </div>

        {compiled.problems.length > 0 && (
          <div className="space-y-1 text-sm text-red-600" role="alert">
            <p>These lines are skipped until they&apos;re fixed:</p>
            <ul className="list-disc space-y-0.5 pl-5">
              {compiled.problems.map((p) => (
                <li key={p.line}>
                  Line {p.line}: {p.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-sm opacity-80">
          Classes:{" "}
          {compiled.classes.size === 0 ? (
            <span className="opacity-70">none yet. Add sounds to the inventory, or define one like P = p t k.</span>
          ) : (
            [...compiled.classes].map(([label, members], i) => (
              <span key={label}>
                {i > 0 && " · "}
                <span className="font-ipa">
                  {label} = {members.join(" ")}
                </span>
              </span>
            ))
          )}
        </p>

        <RuleHelp />

        <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/15">
          <button
            type="button"
            onClick={onSave}
            disabled={!dirty || !name.trim() || saving}
            className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save rules"}
          </button>
          {status && (
            <span role="status" className={`text-sm ${status.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
              {status.text}
            </span>
          )}
          {!status && dirty && <span className="text-sm opacity-70">Unsaved changes</span>}
          <form
            action={remove}
            onSubmit={(e) => {
              if (!window.confirm(`Delete “${saved.name}”? Your words aren't changed.`)) e.preventDefault();
            }}
            className="ml-auto"
          >
            <button type="submit" className="text-sm text-red-600 underline">
              Delete rule set
            </button>
          </form>
        </div>
      </section>

      {words.length > 0 && (
        <DaughterForm
          action={makeDaughter}
          defaultName={saved.name}
          unsaved={dirty}
          wordCount={words.length}
          lostCount={lostCount}
        />
      )}

      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Results</h2>

        <div className="space-y-2 rounded-lg bg-black/[.03] p-3 dark:bg-white/[.05]">
          <label className="flex flex-wrap items-center gap-2 text-sm">
            <span>Try a pronunciation</span>
            <input
              value={trial}
              onChange={(e) => setTrial(e.target.value)}
              placeholder="kata"
              className={`${field} w-48 px-2 py-1 font-ipa text-base`}
            />
            {tried && (
              <span className="font-ipa text-base" data-testid="trial-result">
                → /{tried.result}/ <span className="opacity-70">{spellResult(tried.result, spelling)}</span>
              </span>
            )}
          </label>
          {tried && tried.steps.length > 0 && <Steps steps={tried.steps} />}
        </div>

        {words.length === 0 ? (
          <p className="text-sm opacity-70">
            Your lexicon is empty, so there&apos;s nothing to apply the rules to yet. Try a pronunciation above.
          </p>
        ) : (
          <>
            <p className="text-sm">
              {changedCount} of {words.length} word{words.length === 1 ? "" : "s"} change.
              {phonemes.length > 0 && newSounds.length > 0 && (
                <>
                  {" "}
                  New sounds, not in {languageName}&apos;s inventory:{" "}
                  <span className="font-ipa">{newSounds.join(" ")}</span>
                </>
              )}
            </p>
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search words"
                aria-label="Search words"
                className={`${field} w-56 px-2 py-1`}
              />
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
                Only words that change
              </label>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-black/10 dark:border-white/15">
                  <tr className="[&_th]:py-2 [&_th]:pr-4 [&_th]:font-medium [&_th]:opacity-70">
                    <th>Word</th>
                    <th>Meaning</th>
                    <th>Before</th>
                    <th>After</th>
                    <th>Spelled</th>
                    <th>
                      <span className="sr-only">History</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, SHOWN).map((r) => {
                    const changed = r.steps.length > 0;
                    const open = openWord === r.id;
                    return (
                      <Fragment key={r.id}>
                        <tr className="border-b border-black/5 align-baseline dark:border-white/10 [&_td]:py-1.5 [&_td]:pr-4">
                          <td className="font-ipa text-base">{r.form}</td>
                          <td>{r.gloss}</td>
                          <td className="font-ipa text-base opacity-70">/{r.before}/</td>
                          <td className={`font-ipa text-base ${changed ? "font-semibold" : "opacity-50"}`}>
                            /{r.result}/
                          </td>
                          <td className={`font-ipa text-base ${changed ? "" : "opacity-50"}`}>
                            {spellResult(r.result, spelling)}
                          </td>
                          <td className="whitespace-nowrap text-right">
                            {changed && (
                              <button
                                type="button"
                                aria-expanded={open}
                                onClick={() => setOpenWord(open ? null : r.id)}
                                className="underline opacity-70 hover:opacity-100"
                              >
                                {r.steps.length} step{r.steps.length === 1 ? "" : "s"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-b border-black/5 dark:border-white/10">
                            <td colSpan={6} className="pb-3 pl-4">
                              <Steps steps={r.steps} />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {filtered.length === 0 && <p className="text-sm opacity-70">No words match.</p>}
            {filtered.length > SHOWN && (
              <p className="text-sm opacity-70">
                Showing {SHOWN} of {filtered.length} words. Search to find others.
              </p>
            )}
          </>
        )}
      </section>
    </div>
  );
}

function Steps({ steps }: { steps: Step[] }) {
  return (
    <ol className="space-y-0.5 text-sm">
      {steps.map((s, i) => (
        <li key={i} className="flex flex-wrap gap-x-3">
          <span className="font-ipa text-base">
            /{s.before}/ → /{s.after}/
          </span>
          <span className="opacity-60">
            line {s.line}: <span className="font-ipa">{s.rule}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

function RuleHelp() {
  return (
    <details className="rounded-lg bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">
      <summary className="cursor-pointer font-medium">How to write sound changes</summary>
      <div className="mt-2 space-y-2">
        <p>
          One change per line: what changes, an arrow (<code>&gt;</code> or <code>→</code>), what it becomes, then
          optionally <code>/</code> and where it happens, with <code>_</code> standing for the sound itself.
        </p>
        <table className="text-left">
          <tbody className="[&_td]:py-0.5 [&_td]:pr-4 [&_td:first-child]:whitespace-nowrap [&_td:first-child]:font-ipa">
            <tr>
              <td>p &gt; f</td>
              <td>p becomes f everywhere</td>
            </tr>
            <tr>
              <td>p t k &gt; b d g / V_V</td>
              <td>between vowels, p t k become b d g, in that order</td>
            </tr>
            <tr>
              <td>h &gt; ∅ / _#</td>
              <td>h is lost at the end of a word (# is the start or end)</td>
            </tr>
            <tr>
              <td>∅ &gt; e / #_sC</td>
              <td>e is added before s and a consonant at the start</td>
            </tr>
            <tr>
              <td>ai &gt; e</td>
              <td>a sequence of sounds changes as one</td>
            </tr>
            <tr>
              <td>n &gt; ŋ / _(V)k</td>
              <td>parentheses mark something optional</td>
            </tr>
            <tr>
              <td>s &gt; h / #_, _#</td>
              <td>commas separate places where it happens</td>
            </tr>
            <tr>
              <td>s &gt; z / V_V // _i</td>
              <td>after // come exceptions: not before i</td>
            </tr>
            <tr>
              <td>V &gt; Vː / _#</td>
              <td>a class in the result repeats the sound it matched</td>
            </tr>
            <tr>
              <td>P = p t k</td>
              <td>defines a class for the rules below it</td>
            </tr>
          </tbody>
        </table>
        <p>
          Capital letters are classes. C and V are the consonants and vowels in your inventory, and the word
          generator&apos;s categories work too. A class in the result takes the sound in the same position of the
          class it replaces, so with B = b d g, <span className="font-ipa">P &gt; B</span> turns p into b and k into
          g. Lines starting with # are notes.
        </p>
        <p>
          Each rule changes every place in the word at once, judged on the word before that rule, and the next rule
          works on the result. Stress marks and syllable breaks are left out.
        </p>
      </div>
    </details>
  );
}
