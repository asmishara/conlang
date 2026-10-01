import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { deleteLanguage } from "../actions";

export default async function LanguagePage({ params }: PageProps<"/languages/[id]">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}`);

  const language = await db.language.findFirst({
    where: { id, ownerId: userId },
    include: { _count: { select: { phonemes: true, words: true, grammarPages: true, paradigms: true } } },
  });
  if (!language) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {language.name}
          {language.autonym && (
            <span className="ml-3 text-xl font-normal opacity-70">{language.autonym}</span>
          )}
        </h1>
        {language.description && <p className="max-w-prose opacity-80">{language.description}</p>}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/languages/${language.id}/phonology`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Phonology</h2>
          <p className="text-sm opacity-70">
            {language._count.phonemes === 0
              ? "Choose your sounds and how they are spelled."
              : `${language._count.phonemes} sound${language._count.phonemes === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/lexicon`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Lexicon</h2>
          <p className="text-sm opacity-70">
            {language._count.words === 0
              ? "Start your dictionary."
              : `${language._count.words} word${language._count.words === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/generator`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Word generator</h2>
          <p className="text-sm opacity-70">Generate words that fit your phonology.</p>
        </Link>
        <Link
          href={`/languages/${language.id}/grammar`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Grammar</h2>
          <p className="text-sm opacity-70">
            {language._count.grammarPages === 0
              ? "Document your grammar with glossed examples."
              : `${language._count.grammarPages} page${language._count.grammarPages === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/inflection`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Inflection</h2>
          <p className="text-sm opacity-70">
            {language._count.paradigms === 0
              ? "Set up tables of word forms, like case and number."
              : `${language._count.paradigms} table${language._count.paradigms === 1 ? "" : "s"}`}
          </p>
        </Link>
      </div>

      <form action={deleteLanguage.bind(null, language.id)}>
        <button type="submit" className="text-sm text-red-600 underline">
          Delete this language
        </button>
      </form>
    </div>
  );
}
