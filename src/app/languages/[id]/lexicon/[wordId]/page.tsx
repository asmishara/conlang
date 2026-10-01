import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { phonotacticsOf } from "@/lib/phonotactics";
import { deleteWord, updateWord } from "../actions";
import { WordForm } from "../word-form";

export default async function EditWordPage({ params }: PageProps<"/languages/[id]/lexicon/[wordId]">) {
  const { id, wordId } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/lexicon/${wordId}`);

  const word = await db.word.findFirst({
    where: { id: wordId, languageId: id, language: { ownerId: userId } },
    include: {
      language: {
        select: {
          name: true,
          phonemes: { orderBy: { position: "asc" }, select: { ipa: true, spelling: true } },
          generator: { select: { categories: true, patterns: true, forbidden: true } },
        },
      },
    },
  });
  if (!word) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href={`/languages/${id}/lexicon`} className="text-sm underline opacity-70">
          ← {word.language.name} lexicon
        </Link>
        <h1 className="font-ipa text-3xl font-semibold">{word.form}</h1>
      </header>
      <WordForm
        action={updateWord.bind(null, id, wordId)}
        rules={word.language.phonemes}
        phonotactics={phonotacticsOf(word.language.generator)}
        initial={word}
        submitLabel="Save changes"
        showDetails
      />
      <form action={deleteWord.bind(null, id, wordId)} className="border-t border-black/10 pt-4 dark:border-white/15">
        <button type="submit" className="text-sm text-red-600 underline">
          Delete this word
        </button>
      </form>
    </div>
  );
}
