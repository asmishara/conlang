import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { languageClassSource } from "@/lib/language-classes";
import { storedParadigm } from "@/lib/paradigm-input";
import { partsOfSpeech } from "@/lib/parts-of-speech";
import { deleteParadigm, saveParadigm } from "../actions";
import { ParadigmEditor } from "./paradigm-editor";

export default async function ParadigmPage({ params }: PageProps<"/languages/[id]/inflection/[paradigmId]">) {
  const { id, paradigmId } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/inflection/${paradigmId}`);

  const paradigm = await db.paradigm.findFirst({
    where: { id: paradigmId, languageId: id, language: editableBy(userId) },
    include: { language: { select: { name: true } } },
  });
  if (!paradigm) notFound();

  const [classSource, words, posGroups] = await Promise.all([
    languageClassSource(id),
    db.word.findMany({
      where: { languageId: id, partOfSpeech: paradigm.partOfSpeech },
      select: { form: true },
      orderBy: { createdAt: "asc" },
      take: 200,
    }),
    db.word.groupBy({ by: ["partOfSpeech"], where: { languageId: id, partOfSpeech: { not: null } } }),
  ]);
  const posOptions = [...new Set([...posGroups.map((g) => g.partOfSpeech!), ...partsOfSpeech])];

  return (
    <div className="space-y-6">
      <Link href={`/languages/${id}/inflection`} className="text-sm underline opacity-70">
        ← {paradigm.language.name} inflection
      </Link>
      <ParadigmEditor
        key={paradigm.id}
        initial={{ name: paradigm.name, partOfSpeech: paradigm.partOfSpeech, ...storedParadigm(paradigm) }}
        phonemes={classSource.phonemes}
        categories={classSource.categories}
        sampleWords={words.map((w) => w.form)}
        posOptions={posOptions}
        save={saveParadigm.bind(null, id, paradigm.id)}
        remove={deleteParadigm.bind(null, id, paradigm.id)}
      />
    </div>
  );
}
