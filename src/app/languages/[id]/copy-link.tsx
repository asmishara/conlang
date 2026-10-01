"use client";

import { useState } from "react";

/** Copies the full URL of `path` on this site. */
export function CopyLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(new URL(path, window.location.origin).href);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="rounded-md border border-black/15 px-3 py-1 text-sm dark:border-white/20"
    >
      {copied ? "Copied" : "Copy link"}
    </button>
  );
}
