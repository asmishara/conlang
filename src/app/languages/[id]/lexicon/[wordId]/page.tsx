import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { ParadigmGrid } from "@/components/paradigm-grid";
import { db } from "@/lib/db";
import { cellKey, inflect } from "@/lib/inflection";
import { languageClasses } from "@/lib/language-classes";
import { storedParadigm } from "@/lib/paradigm-input";
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

  const paradigms = word.partOfSpeech
    ? await db.paradigm.findMany({
        where: { languageId: id, partOfSpeech: word.partOfSpeech },
        orderBy: { createdAt: "asc" },
      })
    : [];
  const classes = paradigms.length > 0 ? await languageClasses(id) : null;

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
      {word.partOfSpeech && (
        <section className="space-y-4 border-t border-black/10 pt-4 dark:border-white/15">
          <h2 className="font-semibold">Forms</h2>
          {paradigms.length === 0 ? (
            <p className="text-sm opacity-70">
              No inflection table for {word.partOfSpeech} words yet.{" "}
              <Link href={`/languages/${id}/inflection`} className="underline">
                Make one
              </Link>
              .
            </p>
          ) : (
            paradigms.map((p) => {
              const paradigm = storedParadigm(p);
              const cells = new Map(inflect(word.form, paradigm, classes!).map((c) => [cellKey(c.values), c]));
              return (
                <div key={p.id} className="space-y-2">
                  <h3 className="text-sm">
                    <Link href={`/languages/${id}/inflection/${p.id}`} className="underline-offset-2 hover:underline">
                      {p.name}
                    </Link>
                  </h3>
                  <ParadigmGrid
                    axes={paradigm.dimensions.map((d) => ({
                      name: d.name,
                      values: d.values.map((v) => ({ key: v, label: v })),
                    }))}
                    cell={(values) => {
                      const c = cells.get(cellKey(values));
                      if (c?.error) return <span title={c.error}>?</span>;
                      return c?.form ? (
                        <span className="font-ipa text-base">{c.form}</span>
                      ) : (
                        <span className="opacity-40">—</span>
                      );
                    }}
                  />
                </div>
              );
            })
          )}
        </section>
      )}
      <form action={deleteWord.bind(null, id, wordId)} className="border-t border-black/10 pt-4 dark:border-white/15">
        <button type="submit" className="text-sm text-red-600 underline">
          Delete this word
        </button>
      </form>
    </div>
  );
}
