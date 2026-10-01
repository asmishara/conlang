import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { buildTree } from "@/lib/grammar";
import { createPage } from "./actions";
import { GrammarNav } from "./grammar-nav";

export default async function GrammarLayout({ children, params }: LayoutProps<"/languages/[id]/grammar">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/grammar`);

  const language = await db.language.findFirst({
    where: { id, ownerId: userId },
    select: {
      id: true,
      name: true,
      grammarPages: { select: { id: true, parentId: true, title: true, position: true } },
    },
  });
  if (!language) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href={`/languages/${language.id}`} className="text-sm underline opacity-70">
          ← {language.name}
        </Link>
        <h1 className="text-2xl font-semibold">Grammar</h1>
      </header>
      <div className="grid gap-8 md:grid-cols-[13rem_minmax(0,1fr)]">
        <aside className="space-y-3 md:sticky md:top-4 md:self-start">
          <GrammarNav languageId={language.id} tree={buildTree(language.grammarPages)} />
          <form action={createPage.bind(null, language.id, null)}>
            <button type="submit" className="px-2 text-sm underline">
              + New page
            </button>
          </form>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
