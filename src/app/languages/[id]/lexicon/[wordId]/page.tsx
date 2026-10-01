import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { inflect } from "@/lib/inflection";
import { languageClasses } from "@/lib/language-classes";
import { storedParadigm } from "@/lib/paradigm-input";
import { phonotacticsOf } from "@/lib/phonotactics";
import { saveIrregularForms } from "../../inflection/actions";
import { deleteWord, updateWord } from "../actions";
import { WordForm } from "../word-form";
import { WordForms } from "./word-forms";

export default async function EditWordPage({ params }: PageProps<"/languages/[id]/lexicon/[wordId]">) {
  const { id, wordId } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/lexicon/${wordId}`);

  const word = await db.word.findFirst({
    where: { id: wordId, languageId: id, language: editableBy(userId) },
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

  // Where the word came from and what it became, in this writer's other languages.
  const [source, descendants] = await Promise.all([
    word.sourceWordId
      ? db.word.findFirst({
          where: { id: word.sourceWordId, language: editableBy(userId) },
          select: { id: true, form: true, languageId: true, language: { select: { name: true } } },
        })
      : null,
    db.word.findMany({
      where: { sourceWordId: wordId, language: editableBy(userId) },
      orderBy: { createdAt: "asc" },
      select: { id: true, form: true, languageId: true, language: { select: { name: true } } },
    }),
  ]);

  const paradigms = word.partOfSpeech
    ? await db.paradigm.findMany({
        where: { languageId: id, partOfSpeech: word.partOfSpeech },
        orderBy: { createdAt: "asc" },
        include: { irregularForms: { where: { wordId }, select: { cell: true, form: true } } },
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
        {(source || descendants.length > 0) && (
          <p className="text-sm opacity-80">
            {source && (
              <span className="mr-4">
                From {source.language.name}{" "}
                <Link href={`/languages/${source.languageId}/lexicon/${source.id}`} className="font-ipa underline">
                  {source.form}
                </Link>
              </span>
            )}
            {descendants.length > 0 && (
              <span>
                Became{" "}
                {descendants.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ", "}
                    {d.language.name}{" "}
                    <Link href={`/languages/${d.languageId}/lexicon/${d.id}`} className="font-ipa underline">
                      {d.form}
                    </Link>
                  </span>
                ))}
              </span>
            )}
          </p>
        )}
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
              const irregular = Object.fromEntries(p.irregularForms.map((f) => [f.cell, f.form]));
              return (
                <WordForms
                  key={p.id}
                  name={p.name}
                  href={`/languages/${id}/inflection/${p.id}`}
                  axes={paradigm.dimensions.map((d) => ({
                    name: d.name,
                    values: d.values.map((v) => ({ key: v, label: v })),
                  }))}
                  cells={inflect(word.form, paradigm, classes!, irregular)}
                  save={saveIrregularForms.bind(null, id, wordId, p.id)}
                />
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
