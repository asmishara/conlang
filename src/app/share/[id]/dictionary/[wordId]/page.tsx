import Link from "next/link";
import { notFound } from "next/navigation";
import { ParadigmGrid } from "@/components/paradigm-grid";
import { db } from "@/lib/db";
import { cellKey, inflect } from "@/lib/inflection";
import { languageClasses } from "@/lib/language-classes";
import { pronounce } from "@/lib/orthography";
import { storedParadigm } from "@/lib/paradigm-input";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedWord({ params }: PageProps<"/share/[id]/dictionary/[wordId]">) {
  const { id, wordId } = await params;
  if (!(await sharedLanguage(id))) notFound();

  const word = await db.word.findFirst({ where: { id: wordId, languageId: id } });
  if (!word) notFound();
  const [rules, paradigms] = await Promise.all([
    db.phoneme.findMany({ where: { languageId: id }, orderBy: { position: "asc" }, select: { ipa: true, spelling: true } }),
    word.partOfSpeech
      ? db.paradigm.findMany({
          where: { languageId: id, partOfSpeech: word.partOfSpeech },
          orderBy: { createdAt: "asc" },
          include: { irregularForms: { where: { wordId }, select: { cell: true, form: true } } },
        })
      : [],
  ]);
  const classes = paradigms.length > 0 ? await languageClasses(id) : null;
  const ipa = word.pronunciation ?? (rules.length > 0 ? pronounce(word.form, rules) : null);

  return (
    <article className="space-y-6">
      <header className="space-y-1">
        <Link href={`/share/${id}/dictionary`} className="text-sm underline opacity-70">
          ← Dictionary
        </Link>
        <h2 className="font-ipa text-3xl font-semibold">{word.form}</h2>
        <p className="flex flex-wrap items-baseline gap-x-3">
          {ipa && <span className="font-ipa text-lg opacity-80">/{ipa}/</span>}
          {word.partOfSpeech && <span className="italic opacity-70">{word.partOfSpeech}</span>}
        </p>
        <p className="text-lg">{word.gloss}</p>
      </header>

      {(word.etymology || word.notes || word.tags.length > 0) && (
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-[8rem_minmax(0,1fr)]">
          {word.etymology && (
            <>
              <dt className="font-medium opacity-70">Etymology</dt>
              <dd className="whitespace-pre-line">{word.etymology}</dd>
            </>
          )}
          {word.notes && (
            <>
              <dt className="font-medium opacity-70">Notes</dt>
              <dd className="whitespace-pre-line">{word.notes}</dd>
            </>
          )}
          {word.tags.length > 0 && (
            <>
              <dt className="font-medium opacity-70">Tags</dt>
              <dd>{word.tags.join(", ")}</dd>
            </>
          )}
        </dl>
      )}

      {paradigms.length > 0 && (
        <section className="space-y-4">
          <h3 className="font-semibold">Forms</h3>
          {paradigms.map((p) => {
            const paradigm = storedParadigm(p);
            const irregular = Object.fromEntries(p.irregularForms.map((f) => [f.cell, f.form]));
            const cells = new Map(
              inflect(word.form, paradigm, classes!, irregular).map((c) => [cellKey(c.values), c.form]),
            );
            return (
              <div key={p.id} className="space-y-2">
                <h4 className="text-sm opacity-80">{p.name}</h4>
                <ParadigmGrid
                  axes={paradigm.dimensions.map((d) => ({
                    name: d.name,
                    values: d.values.map((v) => ({ key: v, label: v })),
                  }))}
                  cell={(values) => {
                    const form = cells.get(cellKey(values));
                    return form ? (
                      <span className="font-ipa text-base">{form}</span>
                    ) : (
                      <span className="opacity-40">—</span>
                    );
                  }}
                />
              </div>
            );
          })}
        </section>
      )}
    </article>
  );
}
