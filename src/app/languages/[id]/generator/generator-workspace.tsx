"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { generateWords, validateSettings, type GeneratorSettings } from "@/lib/generator";
import { splitSymbols } from "@/lib/generator-input";
import { pronounce, spell, type SpellingRule } from "@/lib/orthography";
import { createWord } from "../lexicon/actions";
import { saveGeneratorSettings } from "./actions";

const field = "rounded-md border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";
const BATCH = 30;

type Draft = {
  categories: { label: string; members: string }[];
  patterns: string;
  minSyllables: number;
  maxSyllables: number;
  dropoff: boolean;
  forbidden: string;
};

function toDraft(s: GeneratorSettings): Draft {
  return {
    categories: s.categories.map((c) => ({ label: c.label, members: c.members.join(" ") })),
    patterns: s.patterns.join("\n"),
    minSyllables: s.minSyllables,
    maxSyllables: s.maxSyllables,
    dropoff: s.dropoff,
    forbidden: s.forbidden.join(" "),
  };
}

function fromDraft(d: Draft): GeneratorSettings {
  return {
    categories: d.categories
      .filter((c) => c.label.trim() || c.members.trim())
      .map((c) => ({ label: c.label.trim().toUpperCase(), members: splitSymbols(c.members) })),
    patterns: d.patterns
      .split("\n")
      .map((p) => p.trim())
      .filter(Boolean),
    minSyllables: d.minSyllables,
    maxSyllables: d.maxSyllables,
    dropoff: d.dropoff,
    forbidden: splitSymbols(d.forbidden),
  };
}

type Result = { ipa: string; form: string; status: "new" | "adding" | "added" | "error"; error?: string };

export function GeneratorWorkspace({
  languageId,
  initial,
  defaults,
  rules,
  existing,
}: {
  languageId: string;
  initial: GeneratorSettings;
  defaults: GeneratorSettings;
  rules: SpellingRule[];
  existing: string[];
}) {
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(fromDraft(toDraft(initial))));
  const [saveStatus, setSaveStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [results, setResults] = useState<Result[]>([]);
  const [taken, setTaken] = useState(() => new Set(existing));

  const settings = fromDraft(draft);
  const problems = validateSettings(settings);
  const dirty = JSON.stringify(settings) !== savedJson;

  function update(patch: Partial<Draft>) {
    setSaveStatus(null);
    setDraft((d) => ({ ...d, ...patch }));
  }

  function updateCategory(i: number, patch: Partial<Draft["categories"][number]>) {
    update({ categories: draft.categories.map((c, j) => (j === i ? { ...c, ...patch } : c)) });
  }

  function generate() {
    const words = generateWords(settings, BATCH, Math.random, taken);
    setResults(words.map((ipa) => ({ ipa, form: spell(ipa, rules), status: "new" })));
  }

  function save() {
    startSaving(async () => {
      const result = await saveGeneratorSettings(languageId, settings);
      if (result.ok) {
        setSavedJson(JSON.stringify(settings));
        setSaveStatus({ ok: true, text: "Saved" });
      } else {
        setSaveStatus({ ok: false, text: result.error });
      }
    });
  }

  async function addToLexicon(index: number, gloss: string) {
    const r = results[index];
    const setStatus = (patch: Partial<Result>) =>
      setResults((list) => list.map((x, j) => (j === index ? { ...x, ...patch } : x)));
    setStatus({ status: "adding", error: undefined });

    const fd = new FormData();
    fd.set("form", r.form);
    fd.set("gloss", gloss);
    // Keep the exact pronunciation when the spelling would read back differently.
    if (pronounce(r.form, rules) !== r.ipa) fd.set("pronunciation", r.ipa);
    const result = await createWord(languageId, {}, fd);
    if (result.error) {
      setStatus({ status: "error", error: result.error });
    } else {
      setStatus({ status: "added" });
      setTaken((t) => new Set(t).add(r.ipa));
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <section className="space-y-5">
        <div className="space-y-2">
          <h2 className="font-semibold">Categories</h2>
          <p className="text-xs opacity-70">
            A capital letter and the sounds it stands for, separated by spaces.
            {draft.dropoff && " Sounds listed first are used more often."}
          </p>
          <ul className="space-y-2">
            {draft.categories.map((c, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  aria-label="Category letter"
                  value={c.label}
                  maxLength={1}
                  onChange={(e) => updateCategory(i, { label: e.target.value.toUpperCase() })}
                  className={`${field} w-10 text-center font-semibold`}
                />
                <span aria-hidden className="opacity-50">
                  =
                </span>
                <input
                  aria-label={`Sounds in category ${c.label}`}
                  value={c.members}
                  onChange={(e) => updateCategory(i, { members: e.target.value })}
                  className={`${field} min-w-0 flex-1 font-ipa`}
                />
                <button
                  type="button"
                  onClick={() => update({ categories: draft.categories.filter((_, j) => j !== i) })}
                  className="text-sm underline opacity-60 hover:opacity-100"
                  aria-label={`Remove category ${c.label}`}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => update({ categories: [...draft.categories, { label: "", members: "" }] })}
            className="text-sm underline"
          >
            Add category
          </button>
        </div>

        <label className="block space-y-1">
          <span className="font-semibold">Syllable patterns</span>
          <span className="block text-xs opacity-70">
            One per line. Letters are categories, parentheses mark optional parts, anything else is used as is.
            For example: <code>CV</code>, <code>(C)V(N)</code>, <code>sCV</code>. Once saved, they also check the
            words in your lexicon.
          </span>
          <textarea
            value={draft.patterns}
            onChange={(e) => update({ patterns: e.target.value })}
            rows={4}
            className={`${field} block w-full font-ipa`}
          />
        </label>

        <div className="flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            Syllables per word
            <input
              type="number"
              min={1}
              max={10}
              value={draft.minSyllables}
              onChange={(e) => update({ minSyllables: Number(e.target.value) })}
              className={`${field} w-14`}
              aria-label="Minimum syllables"
            />
            to
            <input
              type="number"
              min={1}
              max={10}
              value={draft.maxSyllables}
              onChange={(e) => update({ maxSyllables: Number(e.target.value) })}
              className={`${field} w-14`}
              aria-label="Maximum syllables"
            />
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.dropoff}
              onChange={(e) => update({ dropoff: e.target.checked })}
            />
            Favour sounds listed first
          </label>
        </div>

        <label className="block space-y-1">
          <span className="font-semibold">Forbidden sequences</span>
          <span className="block text-xs opacity-70">
            Generated words containing any of these (in IPA, separated by spaces) are skipped, and lexicon words
            that contain them are flagged. For example: <code>ji wu</code>.
          </span>
          <input
            value={draft.forbidden}
            onChange={(e) => update({ forbidden: e.target.value })}
            className={`${field} block w-full font-ipa`}
          />
        </label>

        {problems.length > 0 && (
          <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
            {problems.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={save}
            disabled={saving || !dirty || problems.length > 0}
            className={`${field} px-3 py-1.5 disabled:opacity-50`}
          >
            {saving ? "Saving…" : "Save settings"}
          </button>
          <button
            type="button"
            onClick={() => update(toDraft(defaults))}
            className="text-sm underline opacity-70 hover:opacity-100"
          >
            Reset to my inventory
          </button>
          {saveStatus && (
            <span
              role="status"
              className={`text-sm ${saveStatus.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}
            >
              {saveStatus.text}
            </span>
          )}
          {!saveStatus && dirty && <span className="text-sm opacity-70">Unsaved changes</span>}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={generate}
            disabled={problems.length > 0}
            className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
          >
            {results.length ? "Generate again" : "Generate words"}
          </button>
          {results.length > 0 && (
            <span className="text-sm opacity-70">
              {results.length} word{results.length === 1 ? "" : "s"}
              {results.length < BATCH && " (these settings can't make more new words)"}
            </span>
          )}
        </div>
        {results.length > 0 && (
          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {results.map((r, i) => (
              <ResultRow key={r.ipa} result={r} onAdd={(gloss) => addToLexicon(i, gloss)} languageId={languageId} />
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function ResultRow({
  result,
  onAdd,
  languageId,
}: {
  result: Result;
  onAdd: (gloss: string) => void;
  languageId: string;
}) {
  const [gloss, setGloss] = useState("");
  return (
    <li className="grid grid-cols-[7rem_7rem_minmax(0,1fr)] items-center gap-3 py-1.5">
      <span className="break-words font-ipa text-lg font-semibold">{result.form}</span>
      <span className="break-words font-ipa opacity-70">/{result.ipa}/</span>
      {result.status === "added" ? (
        <span className="text-sm text-green-700 dark:text-green-400">
          Added to the{" "}
          <Link href={`/languages/${languageId}/lexicon`} className="underline">
            lexicon
          </Link>
        </span>
      ) : (
        <form
          className="flex min-w-0 items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (gloss.trim()) onAdd(gloss);
          }}
        >
          <input
            aria-label={`Meaning of ${result.form}`}
            placeholder="Meaning"
            value={gloss}
            onChange={(e) => setGloss(e.target.value)}
            maxLength={300}
            className={`${field} min-w-0 flex-1 text-sm`}
          />
          <button
            type="submit"
            disabled={!gloss.trim() || result.status === "adding"}
            className={`${field} text-sm disabled:opacity-50`}
          >
            {result.status === "adding" ? "Adding…" : "Add"}
          </button>
          {result.error && <span className="text-sm text-red-600">{result.error}</span>}
        </form>
      )}
    </li>
  );
}
