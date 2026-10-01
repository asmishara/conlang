import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildTree, flatten, subtreeIds } from "@/lib/grammar";
import { deletePage, savePage } from "../../actions";
import { PageEditor } from "./page-editor";

// The layout has already checked that the signed-in user owns this language.
export default async function EditGrammarPage({ params }: PageProps<"/languages/[id]/grammar/[pageId]/edit">) {
  const { id, pageId } = await params;
  const rows = await db.grammarPage.findMany({
    where: { languageId: id },
    select: { id: true, parentId: true, title: true, position: true },
  });
  const page = await db.grammarPage.findFirst({ where: { id: pageId, languageId: id } });
  if (!page) notFound();

  // A page can move anywhere except under itself or its own subpages.
  const blocked = subtreeIds(rows, pageId);
  const parents = flatten(buildTree(rows))
    .filter(({ node }) => !blocked.has(node.id))
    .map(({ node, depth }) => ({ id: node.id, label: `${"\u2003".repeat(depth)}${node.title}` }));
  const subpageCount = blocked.size - 1;

  return (
    <PageEditor
      key={page.id}
      languageId={id}
      pageId={page.id}
      initial={{ title: page.title, body: page.body, parentId: page.parentId ?? "" }}
      parents={parents}
      subpageCount={subpageCount}
      save={savePage.bind(null, id, page.id)}
      remove={deletePage.bind(null, id, page.id)}
    />
  );
}
