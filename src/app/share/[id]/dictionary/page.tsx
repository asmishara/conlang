import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { prepareWords } from "@/lib/lexicon";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedDictionary({ params, searchParams }: PageProps<"/share/[id]/dictionary">) {
  const { id } = await params;
  if (!(await sharedLanguage(id))) notFound();
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const [rows, rules] = await Promise.all([
    db.word.findMany({
      where: {
        languageId: id,
        ...(q
          ? {
              OR: [
                { form: { contains: q, mode: "insensitive" } },
                { gloss: { contains: q, mode: "insensitive" } },
                { tags: { has: q.toLowerCase() } },
              ],
            }
          : {}),
      },
      select: { id: true, form: true, pronunciation: true, partOfSpeech: true, gloss: true },
    }),
    db.phoneme.findMany({ where: { languageId: id }, orderBy: { position: "asc" }, select: { ipa: true, spelling: true } }),
  ]);
  const words = prepareWords(rows, rules);

  return (
    <div className="space-y-4">
      <form className="flex gap-2" role="search">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search words or meanings"
          aria-label="Search"
          className="min-w-0 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
        />
        <button type="submit" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
          Search
        </button>
      </form>
      {words.length === 0 ? (
        <p className="py-6 text-center opacity-70">{q ? "No words match." : "No words yet."}</p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10">
          {words.map((w) => (
            <li key={w.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 py-2">
              <Link
                href={`/share/${id}/dictionary/${w.id}`}
                className="font-ipa text-lg font-semibold underline-offset-2 hover:underline"
              >
                {w.form}
              </Link>
              {w.ipa && <span className="font-ipa opacity-70">/{w.ipa}/</span>}
              {w.partOfSpeech && <span className="text-sm italic opacity-70">{w.partOfSpeech}</span>}
              <span>{w.gloss}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
