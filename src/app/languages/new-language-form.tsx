"use client";

import { useActionState } from "react";
import { createLanguage, type FormState } from "./actions";

const input =
  "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function NewLanguageForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createLanguage, {});

  return (
    <form action={action} className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="space-y-1 text-sm">
          <span>Name</span>
          <input name="name" required maxLength={100} className={input} />
        </label>
        <label className="space-y-1 text-sm">
          <span>Autonym (what speakers call it)</span>
          <input name="autonym" maxLength={100} className={input} />
        </label>
      </div>
      <label className="block space-y-1 text-sm">
        <span>Description</span>
        <textarea name="description" rows={3} maxLength={5000} className={input} />
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create language"}
      </button>
    </form>
  );
}
