import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { languageClassSource } from "@/lib/language-classes";
import { alphabetComparator, pronounce } from "@/lib/orthography";
import { deleteSoundChangeSet, saveSoundChangeSet } from "../actions";
import { SoundChangeEditor } from "./sound-change-editor";

export default async function SoundChangeSetPage({ params }: PageProps<"/languages/[id]/sound-changes/[setId]">) {
  const { id, setId } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/sound-changes/${setId}`);

  const set = await db.soundChangeSet.findFirst({
    where: { id: setId, languageId: id, language: { ownerId: userId } },
    include: { language: { select: { name: true } } },
  });
  if (!set) notFound();

  const [classSource, rows] = await Promise.all([
    languageClassSource(id),
    db.word.findMany({
      where: { languageId: id },
      select: { id: true, form: true, pronunciation: true, gloss: true },
    }),
  ]);
  const spelling = classSource.phonemes.map(({ ipa, spelling }) => ({ ipa, spelling }));
  const compare = alphabetComparator(spelling);
  const words = rows
    .sort((a, b) => compare(a.form, b.form))
    .map((w) => ({ id: w.id, form: w.form, gloss: w.gloss, ipa: w.pronunciation ?? pronounce(w.form, spelling) }));

  return (
    <div className="space-y-6">
      <Link href={`/languages/${id}/sound-changes`} className="text-sm underline opacity-70">
        ← {set.language.name} sound changes
      </Link>
      <SoundChangeEditor
        key={set.id}
        languageName={set.language.name}
        initial={{ name: set.name, rules: set.rules }}
        phonemes={classSource.phonemes}
        categories={classSource.categories}
        words={words}
        save={saveSoundChangeSet.bind(null, id, set.id)}
        remove={deleteSoundChangeSet.bind(null, id, set.id)}
      />
    </div>
  );
}
