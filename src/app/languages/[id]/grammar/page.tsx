import Link from "next/link";
import { db } from "@/lib/db";
import { buildTree, flatten } from "@/lib/grammar";
import { createPage, createStarterPages } from "./actions";

// The layout has already checked that the signed-in user owns this language.
export default async function GrammarContents({ params }: PageProps<"/languages/[id]/grammar">) {
  const { id } = await params;
  const rows = await db.grammarPage.findMany({
    where: { languageId: id },
    select: { id: true, parentId: true, title: true, position: true, body: true },
  });
  const pages = flatten(buildTree(rows));

  if (pages.length === 0) {
    return (
      <section className="space-y-4 rounded-lg border border-black/10 p-6 dark:border-white/15">
        <h2 className="text-lg font-semibold">Document your grammar</h2>
        <p className="max-w-prose text-sm opacity-80">
          Write grammar notes as pages and subpages in Markdown, with tables for paradigms and numbered,
          Leipzig-style glossed examples.
        </p>
        <div className="flex flex-wrap gap-3">
          <form action={createStarterPages.bind(null, id)}>
            <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-background">
              Start with suggested sections
            </button>
          </form>
          <form action={createPage.bind(null, id, null)}>
            <button type="submit" className="rounded-md border border-black/15 px-4 py-2 dark:border-white/20">
              Blank page
            </button>
          </form>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Contents</h2>
      <ol className="space-y-1">
        {pages.map(({ node, depth }) => {
          const row = rows.find((r) => r.id === node.id)!;
          const words = row.body.trim() ? row.body.trim().split(/\s+/).length : 0;
          return (
            <li key={node.id} style={{ paddingLeft: `${depth * 1.25}rem` }} className="flex items-baseline gap-2">
              <Link href={`/languages/${id}/grammar/${node.id}`} className="underline-offset-2 hover:underline">
                {node.title}
              </Link>
              <span className="text-xs opacity-60">{words === 0 ? "empty" : `${words} words`}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
