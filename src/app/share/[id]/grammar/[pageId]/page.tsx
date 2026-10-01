import Link from "next/link";
import { notFound } from "next/navigation";
import { GrammarMarkdown } from "@/components/grammar-markdown";
import { db } from "@/lib/db";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedGrammarPage({ params }: PageProps<"/share/[id]/grammar/[pageId]">) {
  const { id, pageId } = await params;
  if (!(await sharedLanguage(id))) notFound();
  const page = await db.grammarPage.findFirst({
    where: { id: pageId, languageId: id },
    include: {
      parent: { select: { id: true, title: true } },
      children: { orderBy: [{ position: "asc" }, { title: "asc" }], select: { id: true, title: true } },
    },
  });
  if (!page) notFound();

  return (
    <article className="space-y-4">
      <header>
        {page.parent && (
          <Link href={`/share/${id}/grammar/${page.parent.id}`} className="text-sm underline opacity-70">
            {page.parent.title}
          </Link>
        )}
        <h2 className="text-2xl font-semibold">{page.title}</h2>
      </header>
      {page.body.trim() ? <GrammarMarkdown source={page.body} /> : <p className="opacity-60">This page is empty.</p>}
      {page.children.length > 0 && (
        <footer className="border-t border-black/10 pt-4 text-sm dark:border-white/15">
          <h3 className="font-medium opacity-70">Subpages</h3>
          <ul className="list-disc pl-5">
            {page.children.map((c) => (
              <li key={c.id}>
                <Link href={`/share/${id}/grammar/${c.id}`} className="underline">
                  {c.title}
                </Link>
              </li>
            ))}
          </ul>
        </footer>
      )}
    </article>
  );
}
