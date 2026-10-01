"use client";

import { useState, useTransition } from "react";
import { ParadigmGrid } from "@/components/paradigm-grid";
import type { Category } from "@/lib/generator";
import {
  applyRule,
  cellKey,
  cellsOf,
  parseRule,
  shapeProblems,
  soundClasses,
  type Dimension,
} from "@/lib/inflection";
import type { SaveResult } from "../actions";

const field = "rounded-md border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";

type DraftDimension = { id: string; name: string; values: { id: string; label: string }[] };
type Draft = {
  name: string;
  partOfSpeech: string;
  dimensions: DraftDimension[];
  /** Rules keyed by the JSON array of value ids, so renaming a value keeps its rules. */
  rules: Record<string, string>;
  /** The saved cell key each cell came from, so words' irregular forms can follow it. */
  origins: Record<string, string>;
};
type Initial = { name: string; partOfSpeech: string; dimensions: Dimension[]; rules: Record<string, string> };

const newId = () => Math.random().toString(36).slice(2);

/** Re-keys a map of id-keyed cells, dropping those `move` returns null for. */
function remap<T>(cells: Record<string, T>, move: (ids: string[]) => string[] | null): Record<string, T> {
  const out: Record<string, T> = {};
  for (const [key, value] of Object.entries(cells)) {
    const ids = move(JSON.parse(key));
    if (ids) out[JSON.stringify(ids)] = value;
  }
  return out;
}

function idCells(d: Draft): string[][] {
  return cellsOf(d.dimensions.map((dim) => ({ name: dim.id, values: dim.values.map((v) => v.id) })));
}

function labelsOf(d: Draft, ids: string[]): string[] {
  return ids.map((id, i) => d.dimensions[i].values.find((v) => v.id === id)!.label.trim().normalize("NFC"));
}

function toDraft(p: Initial): Draft {
  const dimensions = p.dimensions.map((d, i) => ({
    id: `d${i}`,
    name: d.name,
    values: d.values.map((label, j) => ({ id: `d${i}v${j}`, label })),
  }));
  const rules: Record<string, string> = {};
  const origins: Record<string, string> = {};
  for (const labels of cellsOf(p.dimensions)) {
    const rule = p.rules[cellKey(labels)];
    const ids = JSON.stringify(labels.map((label, i) => dimensions[i].values.find((v) => v.label === label)!.id));
    if (rule) rules[ids] = rule;
    origins[ids] = cellKey(labels);
  }
  return { name: p.name, partOfSpeech: p.partOfSpeech, dimensions, rules, origins };
}

/** The draft as the server stores it, keyed by value labels. */
function toInput(d: Draft): Initial {
  const dimensions = d.dimensions.map((dim) => ({
    name: dim.name.trim(),
    values: dim.values.map((v) => v.label.trim().normalize("NFC")),
  }));
  const rules: Record<string, string> = {};
  for (const ids of idCells(d)) {
    const rule = d.rules[JSON.stringify(ids)]?.trim();
    if (rule) rules[cellKey(labelsOf(d, ids))] = rule;
  }
  return { name: d.name.trim(), partOfSpeech: d.partOfSpeech.trim().toLowerCase(), dimensions, rules };
}

/** Where each saved cell went, and the origins to use once this draft is saved. */
function cellMoves(d: Draft) {
  const moves: Record<string, string> = {};
  const origins: Record<string, string> = {};
  for (const ids of idCells(d)) {
    const key = JSON.stringify(ids);
    const now = cellKey(labelsOf(d, ids));
    if (d.origins[key]) moves[d.origins[key]] = now;
    origins[key] = now;
  }
  return { moves, origins };
}

export function ParadigmEditor({
  initial,
  phonemes,
  categories,
  sampleWords,
  posOptions,
  save,
  remove,
}: {
  initial: Initial;
  phonemes: { ipa: string; kind: "CONSONANT" | "VOWEL"; spelling: string }[];
  categories: Category[];
  sampleWords: string[];
  posOptions: string[];
  save: (input: Initial, moves: Record<string, string>) => Promise<SaveResult>;
  remove: () => Promise<void>;
}) {
  const [draft, setDraft] = useState(() => toDraft(initial));
  const [savedJson, setSavedJson] = useState(() => JSON.stringify(toInput(toDraft(initial))));
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, startSaving] = useTransition();
  const [sample, setSample] = useState(sampleWords[0] ?? "");

  const classes = soundClasses(phonemes, categories);
  const input = toInput(draft);
  const dirty = JSON.stringify(input) !== savedJson;
  const ruleErrors = Object.values(input.rules).flatMap((rule) => {
    const parsed = parseRule(rule, classes);
    return "error" in parsed ? [parsed.error] : [];
  });
  const problems = [
    ...(input.name ? [] : ["Give the table a name"]),
    ...(input.partOfSpeech ? [] : ["Choose the part of speech it's for"]),
    ...shapeProblems(input.dimensions),
  ];
  const canSave = dirty && problems.length === 0 && ruleErrors.length === 0 && !saving;

  function update(patch: Partial<Draft>) {
    setStatus(null);
    setDraft((d) => ({ ...d, ...patch }));
  }

  function updateDimension(i: number, change: (d: DraftDimension) => DraftDimension) {
    update({ dimensions: draft.dimensions.map((d, j) => (j === i ? change(d) : d)) });
  }

  function addDimension() {
    const value = { id: newId(), label: "" };
    // Existing cells move into the new dimension's first value.
    const move = (ids: string[]) => [...ids, value.id];
    update({
      dimensions: [...draft.dimensions, { id: newId(), name: "", values: [value] }],
      rules: remap(draft.rules, move),
      origins: remap(draft.origins, move),
    });
  }

  function removeDimension(i: number) {
    const dim = draft.dimensions[i];
    const first = dim.values[0];
    const keepNote = first?.label ? ` Only the rules and irregular forms for “${first.label}” are kept.` : "";
    if (!window.confirm(`Remove ${dim.name || "this dimension"}?${keepNote}`)) return;
    const move = (ids: string[]) => (ids[i] === first?.id ? ids.filter((_, j) => j !== i) : null);
    update({
      dimensions: draft.dimensions.filter((_, j) => j !== i),
      rules: remap(draft.rules, move),
      origins: remap(draft.origins, move),
    });
  }

  function onSave() {
    const { moves, origins } = cellMoves(draft);
    startSaving(async () => {
      const result = await save(input, moves);
      if (result.ok) {
        setSavedJson(JSON.stringify(input));
        setDraft((d) => ({ ...d, origins }));
        setStatus({ ok: true, text: "Saved" });
      } else {
        setStatus({ ok: false, text: result.error });
      }
    });
  }

  const axes = draft.dimensions.map((d, i) => ({
    name: d.name || `Dimension ${i + 1}`,
    values: d.values.map((v) => ({ key: v.id, label: v.label || "…" })),
  }));

  return (
    <div className="space-y-6">
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
        <label className="space-y-1 text-sm">
          <span>Name</span>
          <input
            value={draft.name}
            maxLength={100}
            onChange={(e) => update({ name: e.target.value })}
            className={`${field} block w-full px-3 py-2 text-lg font-semibold`}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>For words that are</span>
          <input
            value={draft.partOfSpeech}
            maxLength={40}
            list="paradigm-pos"
            onChange={(e) => update({ partOfSpeech: e.target.value })}
            className={`${field} block w-full px-3 py-2`}
          />
          <datalist id="paradigm-pos">
            {posOptions.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
      </div>

      <section className="space-y-3">
        <h2 className="font-semibold">Dimensions</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {draft.dimensions.map((d, i) => (
            <div key={d.id} className="space-y-2 rounded-lg border border-black/10 p-3 dark:border-white/15">
              <div className="flex items-center gap-2">
                <input
                  aria-label={`Name of dimension ${i + 1}`}
                  placeholder={["Case", "Number", "Gender"][i]}
                  value={d.name}
                  maxLength={40}
                  onChange={(e) => updateDimension(i, (dim) => ({ ...dim, name: e.target.value }))}
                  className={`${field} min-w-0 flex-1 font-semibold`}
                />
                {draft.dimensions.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDimension(i)}
                    className="text-sm underline opacity-60 hover:opacity-100"
                  >
                    Remove
                  </button>
                )}
              </div>
              <ul className="space-y-1">
                {d.values.map((v, j) => (
                  <li key={v.id} className="flex items-center gap-2">
                    <input
                      aria-label={`${d.name || `Dimension ${i + 1}`} value ${j + 1}`}
                      value={v.label}
                      maxLength={40}
                      onChange={(e) =>
                        updateDimension(i, (dim) => ({
                          ...dim,
                          values: dim.values.map((x) => (x.id === v.id ? { ...x, label: e.target.value } : x)),
                        }))
                      }
                      className={`${field} min-w-0 flex-1 text-sm`}
                    />
                    {d.values.length > 1 && (
                      <button
                        type="button"
                        aria-label={`Remove ${v.label || "value"}`}
                        onClick={() =>
                          updateDimension(i, (dim) => ({ ...dim, values: dim.values.filter((x) => x.id !== v.id) }))
                        }
                        className="px-1 opacity-50 hover:opacity-100"
                      >
                        ×
                      </button>
                    )}
                  </li>
                ))}
              </ul>
              {d.values.length < 20 && (
                <button
                  type="button"
                  onClick={() =>
                    updateDimension(i, (dim) => ({ ...dim, values: [...dim.values, { id: newId(), label: "" }] }))
                  }
                  className="text-sm underline"
                >
                  Add value
                </button>
              )}
            </div>
          ))}
          {draft.dimensions.length < 3 && (
            <button
              type="button"
              onClick={addDimension}
              className="rounded-lg border border-dashed border-black/20 p-3 text-sm opacity-70 hover:opacity-100 dark:border-white/25"
            >
              + Add a dimension
            </button>
          )}
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="font-semibold">Rules</h2>
          <label className="flex items-center gap-2 text-sm">
            Try it with
            <input
              value={sample}
              onChange={(e) => setSample(e.target.value)}
              list="paradigm-samples"
              placeholder="a word"
              className={`${field} w-40 font-ipa`}
            />
            <datalist id="paradigm-samples">
              {sampleWords.map((w) => (
                <option key={w} value={w} />
              ))}
            </datalist>
          </label>
        </div>
        <ParadigmGrid
          axes={axes}
          cell={(ids) => {
            const key = JSON.stringify(ids);
            const rule = draft.rules[key] ?? "";
            const parsed = parseRule(rule, classes);
            const form = "error" in parsed || !sample.trim() ? null : applyRule(parsed.rule, sample.trim(), classes);
            return (
              <div className="space-y-0.5">
                <input
                  aria-label={`Rule for ${ids.map((id, i) => draft.dimensions[i].values.find((v) => v.id === id)?.label).join(" ")}`}
                  value={rule}
                  placeholder="—"
                  maxLength={300}
                  onChange={(e) => update({ rules: { ...draft.rules, [key]: e.target.value } })}
                  className={`${field} w-40 font-ipa ${"error" in parsed ? "border-red-500 dark:border-red-500" : ""}`}
                />
                {"error" in parsed ? (
                  <p className="max-w-40 text-xs text-red-600">{parsed.error}</p>
                ) : (
                  sample.trim() && (
                    <p className="font-ipa text-base font-semibold" data-testid="preview">
                      {form ?? <span className="font-normal opacity-50">—</span>}
                    </p>
                  )
                )}
              </div>
            );
          }}
        />
        <RuleHelp classes={[...classes.entries()]} />
      </section>

      {problems.length > 0 && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-red-600">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t border-black/10 pt-4 dark:border-white/15">
        <button
          type="button"
          onClick={onSave}
          disabled={!canSave}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save table"}
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
            if (!window.confirm(`Delete “${draft.name || "this table"}”? Words keep their entries.`)) e.preventDefault();
          }}
          className="ml-auto"
        >
          <button type="submit" className="text-sm text-red-600 underline">
            Delete table
          </button>
        </form>
      </div>
    </div>
  );
}

function RuleHelp({ classes }: { classes: [string, string[]][] }) {
  return (
    <details className="rounded-lg bg-black/[.03] p-3 text-sm dark:bg-white/[.05]">
      <summary className="cursor-pointer font-medium">How rules work</summary>
      <div className="mt-2 space-y-2">
        <p>
          <code>~</code> stands for the word. Separate alternatives with <code>;</code> and the first one that fits
          is used. An empty cell has no form.
        </p>
        <table className="text-left">
          <tbody className="[&_td]:py-0.5 [&_td]:pr-4 [&_td:first-child]:font-ipa">
            <tr>
              <td>~ka or -ka</td>
              <td>add a suffix</td>
            </tr>
            <tr>
              <td>ma~ or ma-</td>
              <td>add a prefix</td>
            </tr>
            <tr>
              <td>~a → ~e</td>
              <td>for words ending in a, change it to e (type → or &gt;)</td>
            </tr>
            <tr>
              <td>~V → ~Vn; ~en</td>
              <td>after a vowel add n, otherwise en</td>
            </tr>
            <tr>
              <td>CV~ → CVCV~</td>
              <td>repeat the first syllable</td>
            </tr>
          </tbody>
        </table>
        <p>
          Capital letters are sound classes, written as you spell them. In the result, a class letter repeats the
          sound it matched.
        </p>
        <ul className="space-y-0.5">
          {classes.map(([label, members]) => (
            <li key={label}>
              <span className="font-semibold">{label}</span> ={" "}
              <span className="font-ipa">{members.length ? members.join(" ") : "(empty)"}</span>
            </li>
          ))}
        </ul>
      </div>
    </details>
  );
}
