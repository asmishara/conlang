import Link from "next/link";
import { notFound } from "next/navigation";
import { GrammarMarkdown } from "@/components/grammar-markdown";
import { db } from "@/lib/db";
import { createPage, movePage } from "../actions";

// The layout has already checked that the signed-in user owns this language.
export default async function GrammarPageView({ params }: PageProps<"/languages/[id]/grammar/[pageId]">) {
  const { id, pageId } = await params;
  const page = await db.grammarPage.findFirst({
    where: { id: pageId, languageId: id },
    include: { parent: { select: { id: true, title: true } }, children: { orderBy: [{ position: "asc" }, { title: "asc" }] } },
  });
  if (!page) notFound();

  return (
    <article className="space-y-4">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {page.parent && (
            <Link href={`/languages/${id}/grammar/${page.parent.id}`} className="text-sm underline opacity-70">
              {page.parent.title}
            </Link>
          )}
          <h2 className="text-2xl font-semibold">{page.title}</h2>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <form action={movePage.bind(null, id, page.id, "up")}>
            <button type="submit" aria-label="Move page up" title="Move up" className="opacity-60 hover:opacity-100">
              ↑
            </button>
          </form>
          <form action={movePage.bind(null, id, page.id, "down")}>
            <button type="submit" aria-label="Move page down" title="Move down" className="opacity-60 hover:opacity-100">
              ↓
            </button>
          </form>
          <Link
            href={`/languages/${id}/grammar/${page.id}/edit`}
            className="rounded-md border border-black/15 px-3 py-1 dark:border-white/20"
          >
            Edit
          </Link>
        </div>
      </header>

      {page.body.trim() ? (
        <GrammarMarkdown source={page.body} />
      ) : (
        <p className="opacity-60">
          This page is empty.{" "}
          <Link href={`/languages/${id}/grammar/${page.id}/edit`} className="underline">
            Start writing
          </Link>
          .
        </p>
      )}

      <footer className="space-y-2 border-t border-black/10 pt-4 text-sm dark:border-white/15">
        {page.children.length > 0 && (
          <div>
            <h3 className="font-medium opacity-70">Subpages</h3>
            <ul className="list-disc pl-5">
              {page.children.map((c) => (
                <li key={c.id}>
                  <Link href={`/languages/${id}/grammar/${c.id}`} className="underline">
                    {c.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
        <form action={createPage.bind(null, id, page.id)}>
          <button type="submit" className="underline">
            + Add a subpage
          </button>
        </form>
      </footer>
    </article>
  );
}
