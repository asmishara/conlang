import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { storedParadigm } from "@/lib/paradigm-input";
import { partsOfSpeech } from "@/lib/parts-of-speech";
import { createParadigm } from "./actions";
import { CreateParadigmForm } from "./create-form";

export default async function InflectionPage({ params }: PageProps<"/languages/[id]/inflection">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/inflection`);

  const language = await db.language.findFirst({
    where: { id, ownerId: userId },
    select: { id: true, name: true, paradigms: { orderBy: { createdAt: "asc" } } },
  });
  if (!language) notFound();

  const posGroups = await db.word.groupBy({
    by: ["partOfSpeech"],
    where: { languageId: id, partOfSpeech: { not: null } },
    _count: true,
  });
  const wordCount = new Map(posGroups.map((g) => [g.partOfSpeech!, g._count]));
  const posOptions = [...new Set([...posGroups.map((g) => g.partOfSpeech!), ...partsOfSpeech])];

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link href={`/languages/${language.id}`} className="text-sm underline opacity-70">
          ← {language.name}
        </Link>
        <h1 className="text-2xl font-semibold">Inflection</h1>
        <p className="max-w-prose text-sm opacity-70">
          Set up tables like noun case × number once, with a rule for each cell, and every word with that part of
          speech gets its forms filled in on its page.
        </p>
      </header>

      {language.paradigms.length > 0 && (
        <ul className="divide-y divide-black/5 rounded-lg border border-black/10 dark:divide-white/10 dark:border-white/15">
          {language.paradigms.map((p) => {
            const { dimensions } = storedParadigm(p);
            const words = wordCount.get(p.partOfSpeech) ?? 0;
            return (
              <li key={p.id}>
                <Link
                  href={`/languages/${language.id}/inflection/${p.id}`}
                  className="flex flex-wrap items-baseline justify-between gap-2 p-4 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <span>
                    <span className="font-semibold">{p.name}</span>{" "}
                    <span className="text-sm opacity-70">{dimensions.map((d) => d.name).join(" × ")}</span>
                  </span>
                  <span className="text-sm opacity-70">
                    <span className="italic">{p.partOfSpeech}</span> · {words} word{words === 1 ? "" : "s"}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="font-semibold">{language.paradigms.length === 0 ? "Make your first table" : "New table"}</h2>
        <CreateParadigmForm action={createParadigm.bind(null, language.id)} posOptions={posOptions} />
      </section>
    </div>
  );
}
