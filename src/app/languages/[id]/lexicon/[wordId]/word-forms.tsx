"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { ParadigmGrid, type Axis } from "@/components/paradigm-grid";
import { cellKey, type Cell } from "@/lib/inflection";
import type { SaveResult } from "../../inflection/actions";

const field = "rounded-md border border-black/15 bg-transparent px-2 py-1 dark:border-white/20";

/** One table of a word's forms, where any cell can be given an irregular form. */
export function WordForms({
  name,
  href,
  axes,
  cells,
  save,
}: {
  name: string;
  href: string;
  axes: Axis[];
  cells: Cell[];
  save: (forms: Record<string, string>) => Promise<SaveResult>;
}) {
  const [editing, setEditing] = useState<Record<string, string> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, startSaving] = useTransition();
  const byKey = new Map(cells.map((c) => [cellKey(c.values), c]));
  const hasIrregular = cells.some((c) => c.irregular);

  function startEditing() {
    const forms: Record<string, string> = {};
    for (const c of cells) if (c.irregular) forms[cellKey(c.values)] = c.form ?? "—";
    setError(null);
    setEditing(forms);
  }

  function onSave() {
    if (!editing) return;
    startSaving(async () => {
      const result = await save(editing);
      if (result.ok) setEditing(null);
      else setError(result.error);
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="text-sm">
          <Link href={href} className="underline-offset-2 hover:underline">
            {name}
          </Link>
        </h3>
        {!editing && (
          <button type="button" onClick={startEditing} className="text-sm underline opacity-70 hover:opacity-100">
            Edit irregular forms
          </button>
        )}
      </div>
      <ParadigmGrid
        axes={axes}
        cell={(keys) => {
          const key = cellKey(keys);
          const c = byKey.get(key);
          if (editing) {
            return (
              <input
                aria-label={`Form for ${keys.join(" ")}`}
                value={editing[key] ?? ""}
                placeholder={c?.regular ?? "—"}
                maxLength={100}
                onChange={(e) => setEditing({ ...editing, [key]: e.target.value })}
                className={`${field} w-32 font-ipa`}
              />
            );
          }
          if (c?.error && !c.irregular) return <span title={c.error}>?</span>;
          const form = c?.form ? (
            <span className="font-ipa text-base">{c.form}</span>
          ) : (
            <span className="opacity-40">—</span>
          );
          return c?.irregular ? (
            <span title={`Irregular. The rule gives ${c.regular ?? "no form"}.`}>
              {form}
              <span aria-hidden className="ml-0.5 text-amber-700 dark:text-amber-400">
                *
              </span>
              <span className="sr-only"> (irregular)</span>
            </span>
          ) : (
            form
          );
        }}
      />
      {editing ? (
        <div className="space-y-2">
          <p className="text-xs opacity-70">
            Type a form to replace what the rule gives, or a dash for no form. Leave a cell empty to use the rule.
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onSave}
              disabled={saving}
              className="rounded-md bg-foreground px-3 py-1.5 text-sm text-background disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save forms"}
            </button>
            <button type="button" onClick={() => setEditing(null)} className="text-sm underline opacity-70">
              Cancel
            </button>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </div>
        </div>
      ) : (
        hasIrregular && <p className="text-xs opacity-60">* Irregular for this word</p>
      )}
    </div>
  );
}
