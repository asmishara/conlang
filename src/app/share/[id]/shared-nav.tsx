"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const sections = [
  { path: "", label: "Overview" },
  { path: "/sounds", label: "Sounds" },
  { path: "/dictionary", label: "Dictionary" },
  { path: "/grammar", label: "Grammar" },
];

export function SharedNav({ base }: { base: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Sections" className="flex flex-wrap gap-1 text-sm">
      {sections.map((s) => {
        const href = `${base}${s.path}`;
        const active = s.path ? pathname === href || pathname.startsWith(`${href}/`) : pathname === href;
        return (
          <Link
            key={s.label}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`rounded-md px-3 py-1.5 hover:bg-black/5 dark:hover:bg-white/10 ${
              active ? "bg-black/5 font-medium dark:bg-white/10" : "opacity-80"
            }`}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
