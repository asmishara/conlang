import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedOverview({ params }: PageProps<"/share/[id]">) {
  const { id } = await params;
  const language = await sharedLanguage(id);
  if (!language) notFound();

  const [sounds, words, pages] = await Promise.all([
    db.phoneme.count({ where: { languageId: id } }),
    db.word.count({ where: { languageId: id } }),
    db.grammarPage.count({ where: { languageId: id } }),
  ]);
  const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
  const card = "rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5";

  return (
    <div className="space-y-6">
      {language.description && <p className="max-w-prose whitespace-pre-line opacity-80">{language.description}</p>}
      <div className="grid gap-4 sm:grid-cols-3">
        <Link href={`/share/${id}/sounds`} className={card}>
          <h2 className="font-semibold">Sounds</h2>
          <p className="text-sm opacity-70">{plural(sounds, "sound")} and how they&apos;re spelled</p>
        </Link>
        <Link href={`/share/${id}/dictionary`} className={card}>
          <h2 className="font-semibold">Dictionary</h2>
          <p className="text-sm opacity-70">{plural(words, "word")}</p>
        </Link>
        <Link href={`/share/${id}/grammar`} className={card}>
          <h2 className="font-semibold">Grammar</h2>
          <p className="text-sm opacity-70">{plural(pages, "page")}</p>
        </Link>
      </div>
    </div>
  );
}
