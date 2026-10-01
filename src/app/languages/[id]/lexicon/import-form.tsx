"use client";

import { useActionState } from "react";
import type { ImportState } from "./actions";

export function ImportForm({ action }: { action: (prev: ImportState, formData: FormData) => Promise<ImportState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2 text-sm">
      <p className="opacity-70">
        Columns: <code>word</code> and <code>gloss</code> are required; <code>pronunciation</code>,{" "}
        <code>part_of_speech</code>, <code>etymology</code>, <code>notes</code> and <code>tags</code> are optional.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input name="file" type="file" accept=".csv,text/csv" required className="text-sm" />
        <button
          type="submit"
          disabled={pending}
          className="rounded-md border border-black/15 px-3 py-1 disabled:opacity-50 dark:border-white/20"
        >
          {pending ? "Importing…" : "Import"}
        </button>
      </div>
      {state.error && <p className="text-red-600">{state.error}</p>}
      {state.imported != null && (
        <p role="status" className="text-green-700 dark:text-green-400">
          Imported {state.imported} word{state.imported === 1 ? "" : "s"}.
        </p>
      )}
      {state.problems && state.problems.length > 0 && (
        <ul className="list-disc pl-5 text-red-600">
          {state.problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      )}
    </form>
  );
}
