import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { countRules } from "@/lib/sound-changes";
import { createSoundChangeSet } from "./actions";
import { CreateSetForm } from "./create-form";

export default async function SoundChangesPage({ params }: PageProps<"/languages/[id]/sound-changes">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/sound-changes`);

  const language = await db.language.findFirst({
    where: { id, ownerId: userId },
    select: { id: true, name: true, soundChanges: { orderBy: { createdAt: "asc" } } },
  });
  if (!language) notFound();

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link href={`/languages/${language.id}`} className="text-sm underline opacity-70">
          ← {language.name}
        </Link>
        <h1 className="text-2xl font-semibold">Sound changes</h1>
        <p className="max-w-prose text-sm opacity-70">
          Write the changes a language goes through over time, like <span className="font-ipa">p t k &gt; b d g / V_V</span>,
          and see what every word in the lexicon becomes. Keep a separate rule set for each descendant language.
        </p>
      </header>

      {language.soundChanges.length > 0 && (
        <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {language.soundChanges.map((s) => {
            const rules = countRules(s.rules);
            return (
              <li key={s.id}>
                <Link
                  href={`/languages/${language.id}/sound-changes/${s.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 p-4 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span className="font-semibold">{s.name}</span>
                  <span className="text-sm opacity-70">
                    {rules} rule{rules === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="font-semibold">{language.soundChanges.length === 0 ? "Start a rule set" : "New rule set"}</h2>
        <CreateSetForm action={createSoundChangeSet.bind(null, language.id)} />
      </section>
    </div>
  );
}
