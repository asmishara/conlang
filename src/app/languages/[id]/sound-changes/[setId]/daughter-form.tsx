"use client";

import { useActionState } from "react";
import type { CreateState } from "../actions";

const field = "min-w-48 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function DaughterForm({
  action,
  defaultName,
  unsaved,
  wordCount,
  lostCount,
}: {
  action: (prev: CreateState, formData: FormData) => Promise<CreateState>;
  defaultName: string;
  unsaved: boolean;
  wordCount: number;
  lostCount: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const kept = wordCount - lostCount;
  return (
    <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
      <h2 className="font-semibold">Make a daughter language</h2>
      <p className="max-w-prose text-sm opacity-80">
        Starts a new language with these results: {kept} word{kept === 1 ? "" : "s"}, each linked to the word it came
        from, and an inventory of the sounds they use. New sounds are spelled as IPA until you change them. This
        language isn&apos;t changed.
        {lostCount > 0 && (
          <>
            {" "}
            {lostCount} word{lostCount === 1 ? " loses" : "s lose"} every sound and {lostCount === 1 ? "is" : "are"} left
            out.
          </>
        )}
      </p>
      <form action={formAction} className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-sm">
          <span>Name</span>
          <input name="name" required maxLength={100} defaultValue={defaultName} className={field} />
        </label>
        <button
          type="submit"
          disabled={pending || unsaved}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create daughter language"}
        </button>
        {unsaved && <p className="w-full text-sm opacity-70">Save your rules first.</p>}
        {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
      </form>
    </section>
  );
}
