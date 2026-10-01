import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildTree, flatten } from "@/lib/grammar";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedGrammarContents({ params }: PageProps<"/share/[id]/grammar">) {
  const { id } = await params;
  if (!(await sharedLanguage(id))) notFound();
  const rows = await db.grammarPage.findMany({
    where: { languageId: id },
    select: { id: true, parentId: true, title: true, position: true },
  });
  const pages = flatten(buildTree(rows));
  if (pages.length === 0) return <p className="opacity-70">No grammar pages yet.</p>;

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold">Contents</h2>
      <ol className="space-y-1">
        {pages.map(({ node, depth }) => (
          <li key={node.id} style={{ paddingLeft: `${depth * 1.25}rem` }}>
            <Link href={`/share/${id}/grammar/${node.id}`} className="underline-offset-2 hover:underline">
              {node.title}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
