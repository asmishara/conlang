"use client";

import { useActionState } from "react";
import { CopyLinkButton } from "./copy-link";
import type { InviteState } from "./editor-actions";

export function InvitePanel({
  action,
  days,
}: {
  action: (prev: InviteState) => Promise<InviteState>;
  days: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const path = state.token ? `/invite/${state.token}` : null;
  return (
    <div className="space-y-2 text-sm">
      <form action={formAction}>
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-foreground px-3 py-1.5 text-background disabled:opacity-50"
        >
          {pending ? "Creating…" : path ? "Create another invite link" : "Create an invite link"}
        </button>
      </form>
      {path && (
        <div className="space-y-1 rounded-md bg-black/[.03] p-3 dark:bg-white/[.05]" data-testid="invite-link">
          <div className="flex flex-wrap items-center gap-3">
            <code className="break-all">{path}</code>
            <CopyLinkButton path={path} />
          </div>
          <p className="opacity-70">
            Send this to one person. It works once, for {days} days, after they sign in. Copy it now: it won&apos;t be
            shown again.
          </p>
        </div>
      )}
      {state.error && <p className="text-red-600">{state.error}</p>}
    </div>
  );
}
