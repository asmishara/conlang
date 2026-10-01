"use client";

import { useActionState, useState } from "react";
import { pronounce, type SpellingRule } from "@/lib/orthography";
import type { WordFormState } from "./actions";

export const partsOfSpeech = [
  "noun",
  "verb",
  "adjective",
  "adverb",
  "pronoun",
  "preposition",
  "postposition",
  "conjunction",
  "particle",
  "interjection",
  "numeral",
  "determiner",
  "affix",
];

const field = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

type Initial = {
  form: string;
  gloss: string;
  pronunciation: string | null;
  partOfSpeech: string | null;
  etymology: string | null;
  notes: string | null;
  tags: string[];
};

const empty: Initial = {
  form: "",
  gloss: "",
  pronunciation: null,
  partOfSpeech: null,
  etymology: null,
  notes: null,
  tags: [],
};

/** Add or edit a dictionary entry, with a live pronunciation preview. */
export function WordForm({
  action,
  rules,
  initial = empty,
  submitLabel,
  showDetails = false,
}: {
  action: (prev: WordFormState, formData: FormData) => Promise<WordFormState>;
  rules: SpellingRule[];
  initial?: Initial;
  submitLabel: string;
  showDetails?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  // Remount the fields after each successful add so they clear.
  return (
    <form action={formAction} className="space-y-3">
      <Fields key={state.count ?? 0} rules={rules} initial={initial} showDetails={showDetails} />
      <div className="flex items-center gap-3">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        {!state.error && state.added && (
          <p role="status" className="text-sm text-green-700 dark:text-green-400">
            Added “{state.added}”
          </p>
        )}
      </div>
    </form>
  );
}

function Fields({ rules, initial, showDetails }: { rules: SpellingRule[]; initial: Initial; showDetails: boolean }) {
  const [form, setForm] = useState(initial.form);
  const derived = rules.length > 0 && form.trim() ? pronounce(form, rules) : "";

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-[1fr_1fr_10rem]">
        <label className="space-y-1 text-sm">
          <span>Word</span>
          <input
            name="form"
            required
            maxLength={100}
            value={form}
            onChange={(e) => setForm(e.target.value)}
            className={`${field} font-ipa`}
            autoComplete="off"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>Meaning</span>
          <input name="gloss" required maxLength={300} defaultValue={initial.gloss} className={field} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Part of speech</span>
          <input
            name="partOfSpeech"
            list="parts-of-speech"
            maxLength={40}
            defaultValue={initial.partOfSpeech ?? ""}
            className={field}
          />
          <datalist id="parts-of-speech">
            {partsOfSpeech.map((p) => (
              <option key={p} value={p} />
            ))}
          </datalist>
        </label>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>
            Pronunciation <span className="opacity-60">(leave blank to use your spelling rules)</span>
          </span>
          <input
            name="pronunciation"
            maxLength={100}
            defaultValue={initial.pronunciation ?? ""}
            placeholder={derived ? `/${derived}/` : rules.length ? "" : "Set up phonology to derive this"}
            className={`${field} font-ipa`}
          />
        </label>
        <label className="space-y-1 text-sm">
          <span>
            Tags <span className="opacity-60">(comma-separated)</span>
          </span>
          <input name="tags" maxLength={500} defaultValue={initial.tags.join(", ")} className={field} />
        </label>
      </div>
      {showDetails ? (
        <DetailFields initial={initial} />
      ) : (
        <details className="text-sm">
          <summary className="cursor-pointer opacity-70">Etymology and notes</summary>
          <div className="mt-3">
            <DetailFields initial={initial} />
          </div>
        </details>
      )}
    </>
  );
}

function DetailFields({ initial }: { initial: Initial }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="space-y-1 text-sm">
        <span>Etymology</span>
        <textarea name="etymology" rows={2} maxLength={2000} defaultValue={initial.etymology ?? ""} className={field} />
      </label>
      <label className="space-y-1 text-sm">
        <span>Notes</span>
        <textarea name="notes" rows={2} maxLength={5000} defaultValue={initial.notes ?? ""} className={field} />
      </label>
    </div>
  );
}
