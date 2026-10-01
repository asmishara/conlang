import { notFound } from "next/navigation";
import { GrammarNav } from "@/components/grammar-nav";
import { db } from "@/lib/db";
import { buildTree } from "@/lib/grammar";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedGrammarLayout({ children, params }: LayoutProps<"/share/[id]/grammar">) {
  const { id } = await params;
  if (!(await sharedLanguage(id))) notFound();
  const pages = await db.grammarPage.findMany({
    where: { languageId: id },
    select: { id: true, parentId: true, title: true, position: true },
  });

  return (
    <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
      <aside className="md:sticky md:top-4 md:self-start">
        <GrammarNav base={`/share/${id}/grammar`} tree={buildTree(pages)} />
      </aside>
      <div className="min-w-0">{children}</div>
    </div>
  );
}
