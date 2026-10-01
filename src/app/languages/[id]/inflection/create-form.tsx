"use client";

import { useActionState } from "react";
import type { CreateState } from "./actions";

const field = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function CreateParadigmForm({
  action,
  posOptions,
}: {
  action: (prev: CreateState, formData: FormData) => Promise<CreateState>;
  posOptions: string[];
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="min-w-40 flex-1 space-y-1 text-sm">
        <span>For words that are</span>
        <input name="partOfSpeech" required maxLength={40} list="paradigm-pos" placeholder="noun" className={field} />
        <datalist id="paradigm-pos">
          {posOptions.map((p) => (
            <option key={p} value={p} />
          ))}
        </datalist>
      </label>
      <label className="min-w-40 flex-1 space-y-1 text-sm">
        <span>
          Name <span className="opacity-60">(optional)</span>
        </span>
        <input name="name" maxLength={100} placeholder="Noun declension" className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create table"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
