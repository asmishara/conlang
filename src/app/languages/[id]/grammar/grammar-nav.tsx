"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { PageNode } from "@/lib/grammar";

export function GrammarNav({ languageId, tree }: { languageId: string; tree: PageNode[] }) {
  const pathname = usePathname();
  const base = `/languages/${languageId}/grammar`;
  return (
    <nav aria-label="Grammar pages" className="text-sm">
      <Link
        href={base}
        className={`block rounded px-2 py-1 font-semibold ${pathname === base ? "bg-black/5 dark:bg-white/10" : ""}`}
      >
        Contents
      </Link>
      <NavList nodes={tree} base={base} pathname={pathname} />
    </nav>
  );
}

function NavList({ nodes, base, pathname }: { nodes: PageNode[]; base: string; pathname: string }) {
  if (nodes.length === 0) return null;
  return (
    <ul className="space-y-0.5">
      {nodes.map((n) => {
        const href = `${base}/${n.id}`;
        const active = pathname === href || pathname === `${href}/edit`;
        return (
          <li key={n.id}>
            <Link
              href={href}
              aria-current={active ? "page" : undefined}
              className={`block truncate rounded px-2 py-1 hover:bg-black/5 dark:hover:bg-white/10 ${
                active ? "bg-black/5 font-medium dark:bg-white/10" : ""
              }`}
            >
              {n.title}
            </Link>
            {n.children.length > 0 && (
              <div className="ml-3 border-l border-black/10 pl-1 dark:border-white/15">
                <NavList nodes={n.children} base={base} pathname={pathname} />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
