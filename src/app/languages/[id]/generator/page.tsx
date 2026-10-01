import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { defaultSettings, type Category, type GeneratorSettings } from "@/lib/generator";
import { pronounce } from "@/lib/orthography";
import { GeneratorWorkspace } from "./generator-workspace";

export default async function GeneratorPage({ params }: PageProps<"/languages/[id]/generator">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/generator`);

  const language = await db.language.findFirst({
    where: { id, ...editableBy(userId) },
    select: {
      id: true,
      name: true,
      phonemes: { orderBy: { position: "asc" }, select: { ipa: true, kind: true, spelling: true } },
      words: { select: { form: true, pronunciation: true } },
      generator: true,
    },
  });
  if (!language) notFound();

  const rules = language.phonemes.map(({ ipa, spelling }) => ({ ipa, spelling }));
  const defaults = defaultSettings(language.phonemes);
  const saved = language.generator;
  const settings: GeneratorSettings = saved
    ? {
        categories: saved.categories as Category[],
        patterns: saved.patterns,
        minSyllables: saved.minSyllables,
        maxSyllables: saved.maxSyllables,
        dropoff: saved.dropoff,
        forbidden: saved.forbidden,
      }
    : defaults;
  // Pronunciations already in the lexicon, so the generator doesn't suggest them again.
  const existing = language.words.map((w) => w.pronunciation ?? pronounce(w.form, rules));

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href={`/languages/${language.id}`} className="text-sm underline opacity-70">
          ← {language.name}
        </Link>
        <h1 className="text-2xl font-semibold">Word generator</h1>
        <p className="max-w-prose text-sm opacity-70">
          Describe your syllables with sound categories and patterns, then generate words that fit. Add the ones
          you like straight to the lexicon.
        </p>
      </header>
      {language.phonemes.length === 0 ? (
        <p className="rounded-lg border border-black/10 p-4 text-sm dark:border-white/15">
          Your inventory is empty.{" "}
          <Link href={`/languages/${language.id}/phonology`} className="underline">
            Choose some sounds
          </Link>{" "}
          first, and the generator will start from them.
        </p>
      ) : (
        <GeneratorWorkspace
          languageId={language.id}
          initial={settings}
          defaults={defaults}
          rules={rules}
          existing={existing}
        />
      )}
    </div>
  );
}
