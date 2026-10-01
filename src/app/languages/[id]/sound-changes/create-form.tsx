"use client";

import { useActionState } from "react";
import type { CreateState } from "./actions";

const field = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function CreateSetForm({ action }: { action: (prev: CreateState, formData: FormData) => Promise<CreateState> }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="flex flex-wrap items-end gap-3">
      <label className="min-w-40 flex-1 space-y-1 text-sm">
        <span>Name</span>
        <input name="name" maxLength={100} placeholder="Old Velarish" className={field} />
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
      >
        {pending ? "Creating…" : "Create rule set"}
      </button>
      {state.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
