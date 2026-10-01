import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { deleteLanguage } from "../actions";

const sections = [
  { title: "Phonology", note: "Sound inventory and spelling rules (coming in M1)." },
  { title: "Lexicon", note: "Your dictionary (coming in M1)." },
  { title: "Word generator", note: "Generate words that fit your phonology (coming in M1)." },
  { title: "Grammar", note: "Grammar pages and inflection tables (coming in M2)." },
];

export default async function LanguagePage({ params }: PageProps<"/languages/[id]">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}`);

  const language = await db.language.findFirst({ where: { id, ownerId: userId } });
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
        {sections.map((s) => (
          <div key={s.title} className="rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h2 className="font-semibold">{s.title}</h2>
            <p className="text-sm opacity-70">{s.note}</p>
          </div>
        ))}
      </div>

      <form action={deleteLanguage.bind(null, language.id)}>
        <button type="submit" className="text-sm text-red-600 underline">
          Delete this language
        </button>
      </form>
    </div>
  );
}
