"use client";

import Link from "next/link";
import { startTransition, useActionState, useState } from "react";
import { GrammarMarkdown } from "@/components/grammar-markdown";
import type { PageFormState } from "../../actions";

const field = "w-full rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20";

export function PageEditor({
  languageId,
  pageId,
  initial,
  parents,
  subpageCount,
  save,
  remove,
}: {
  languageId: string;
  pageId: string;
  initial: { title: string; body: string; parentId: string };
  parents: { id: string; label: string }[];
  subpageCount: number;
  save: (prev: PageFormState, formData: FormData) => Promise<PageFormState>;
  remove: () => Promise<void>;
}) {
  const [state, formAction, pending] = useActionState(save, {});
  const [title, setTitle] = useState(initial.title);
  const [body, setBody] = useState(initial.body);
  const [parentId, setParentId] = useState(initial.parentId);
  const [saved, setSaved] = useState(initial);
  const [lastSavedAt, setLastSavedAt] = useState<number | undefined>(undefined);
  // Record what was saved once a new save completes (render-time update, no effect needed).
  if (state.savedAt && state.savedAt !== lastSavedAt) {
    setLastSavedAt(state.savedAt);
    setSaved({ title, body, parentId });
  }
  const dirty = title !== saved.title || body !== saved.body || parentId !== saved.parentId;

  return (
    <div className="space-y-4">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          // Submit without React's automatic form reset, which would snap the
          // controlled "Inside" select back to its first option after saving.
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => formAction(data));
        }}
      >
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_14rem]">
          <label className="space-y-1 text-sm">
            <span>Title</span>
            <input
              name="title"
              required
              maxLength={200}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={`${field} text-lg font-semibold`}
            />
          </label>
          <label className="space-y-1 text-sm">
            <span>Inside</span>
            <select name="parentId" value={parentId} onChange={(e) => setParentId(e.target.value)} className={field}>
              <option value="">(top level)</option>
              {parents.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>Text (Markdown)</span>
            <textarea
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={22}
              className={`${field} font-mono text-sm leading-relaxed`}
              spellCheck
            />
          </label>
          <div className="space-y-1 text-sm">
            <span>Preview</span>
            <div className="max-h-[34rem] min-h-40 overflow-y-auto rounded-md border border-dashed border-black/15 p-4 text-base dark:border-white/20">
              {body.trim() ? <GrammarMarkdown source={body} /> : <p className="opacity-50">Nothing to preview yet.</p>}
            </div>
          </div>
        </div>

        <div className="sticky bottom-0 flex flex-wrap items-center gap-3 border-t border-black/10 bg-background py-3 dark:border-white/15">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
          >
            {pending ? "Saving…" : "Save"}
          </button>
          <Link href={`/languages/${languageId}/grammar/${pageId}`} className="text-sm underline">
            {dirty ? "Discard changes" : "Done"}
          </Link>
          {state.error && <span className="text-sm text-red-600">{state.error}</span>}
          {!state.error && !dirty && state.savedAt && (
            <span role="status" className="text-sm text-green-700 dark:text-green-400">
              Saved
            </span>
          )}
          {dirty && !pending && <span className="text-sm opacity-70">Unsaved changes</span>}
        </div>
      </form>

      <details className="text-sm">
        <summary className="cursor-pointer opacity-70">Formatting help</summary>
        <div className="mt-2 space-y-2 opacity-80">
          <p>
            Use Markdown: <code># Heading</code>, <code>**bold**</code>, <code>*italic*</code>, <code>- lists</code>,
            and tables with <code>| a | b |</code> rows.
          </p>
          <p>For a numbered glossed example, put the lines in a gloss block. Words line up by position:</p>
          <pre className="rounded bg-black/5 p-2 font-mono text-xs dark:bg-white/10">
            {"```gloss\ntama-ki   nami\nwater-PL  run\n\"The waters run.\"\n```"}
          </pre>
          <p>Capitalized abbreviations like PL, 3SG or ERG are shown in small caps.</p>
        </div>
      </details>

      <form
        action={remove}
        onSubmit={(e) => {
          const extra = subpageCount ? ` and its ${subpageCount} subpage${subpageCount === 1 ? "" : "s"}` : "";
          if (!confirm(`Delete “${saved.title}”${extra}? This can't be undone.`)) e.preventDefault();
        }}
        className="border-t border-black/10 pt-4 dark:border-white/15"
      >
        <button type="submit" className="text-sm text-red-600 underline">
          Delete this page
        </button>
      </form>
    </div>
  );
}
