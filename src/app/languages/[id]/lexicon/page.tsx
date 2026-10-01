import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { prepareWords } from "@/lib/lexicon";
import { compilePhonotactics, describeProblem, phonotacticsOf } from "@/lib/phonotactics";
import { createWord, importWords } from "./actions";
import { ImportForm } from "./import-form";
import { WordForm } from "./word-form";

export default async function LexiconPage({ params, searchParams }: PageProps<"/languages/[id]/lexicon">) {
  const { id } = await params;
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const pos = typeof sp.pos === "string" ? sp.pos : "";
  const misfitsOnly = sp.misfits === "1";

  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/lexicon`);

  const language = await db.language.findFirst({
    where: { id, ...editableBy(userId) },
    select: {
      id: true,
      name: true,
      phonemes: { orderBy: { position: "asc" }, select: { ipa: true, spelling: true } },
      generator: { select: { categories: true, patterns: true, forbidden: true } },
    },
  });
  if (!language) notFound();

  const [rows, total, posGroups] = await Promise.all([
    db.word.findMany({
      where: {
        languageId: id,
        ...(pos ? { partOfSpeech: pos } : {}),
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
      select: { id: true, form: true, pronunciation: true, partOfSpeech: true, gloss: true, tags: true },
    }),
    db.word.count({ where: { languageId: id } }),
    db.word.groupBy({
      by: ["partOfSpeech"],
      where: { languageId: id, partOfSpeech: { not: null } },
      orderBy: { partOfSpeech: "asc" },
    }),
  ]);
  const rules = language.phonemes;
  const phonotactics = phonotacticsOf(language.generator);
  const check = phonotactics && compilePhonotactics(phonotactics);
  const prepared = prepareWords(rows, rules, check);
  const misfitCount = prepared.filter((w) => w.problems.length > 0).length;
  const words = misfitsOnly ? prepared.filter((w) => w.problems.length > 0) : prepared;
  const filtered = q !== "" || pos !== "" || misfitsOnly;
  const lexiconUrl = (misfits: boolean) => {
    const params = new URLSearchParams({ ...(q && { q }), ...(pos && { pos }), ...(misfits && { misfits: "1" }) });
    return `/languages/${language.id}/lexicon${params.size ? `?${params}` : ""}`;
  };

  return (
    <div className="space-y-8">
      <header className="space-y-1">
        <Link href={`/languages/${language.id}`} className="text-sm underline opacity-70">
          ← {language.name}
        </Link>
        <h1 className="text-2xl font-semibold">Lexicon</h1>
        <p className="text-sm opacity-70">
          {total} word{total === 1 ? "" : "s"}
          {rules.length === 0 && (
            <>
              {" · "}
              <Link href={`/languages/${language.id}/phonology`} className="underline">
                Set up phonology
              </Link>{" "}
              to derive pronunciations and sort by your alphabet.
            </>
          )}
          {rules.length > 0 && total > 0 && !check && (
            <>
              {" · "}
              <Link href={`/languages/${language.id}/generator`} className="underline">
                Save syllable patterns
              </Link>{" "}
              to check your words against them.
            </>
          )}
        </p>
      </header>

      <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
        <h2 className="font-semibold">Add a word</h2>
        <WordForm
          action={createWord.bind(null, language.id)}
          rules={rules}
          phonotactics={phonotactics}
          submitLabel="Add word"
        />
      </section>

      <section className="space-y-3">
        <form className="flex flex-wrap items-center gap-2" role="search">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search words, meanings or tags"
            aria-label="Search"
            className="min-w-0 flex-1 rounded-md border border-black/15 bg-transparent px-3 py-2 dark:border-white/20"
          />
          <select
            name="pos"
            defaultValue={pos}
            aria-label="Part of speech"
            className="rounded-md border border-black/15 bg-transparent px-2 py-2 dark:border-white/20"
          >
            <option value="">All parts of speech</option>
            {posGroups.map((g) => (
              <option key={g.partOfSpeech} value={g.partOfSpeech!}>
                {g.partOfSpeech}
              </option>
            ))}
          </select>
          {misfitsOnly && <input type="hidden" name="misfits" value="1" />}
          <button type="submit" className="rounded-md border border-black/15 px-3 py-2 dark:border-white/20">
            Search
          </button>
          {filtered && (
            <Link href={`/languages/${language.id}/lexicon`} className="text-sm underline">
              Clear
            </Link>
          )}
        </form>

        {(misfitCount > 0 || misfitsOnly) && (
          <p className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            {misfitsOnly ? "Showing" : "⚠"} {misfitCount} word{misfitCount === 1 ? "" : "s"} that{" "}
            {misfitCount === 1 ? "doesn't" : "don't"} fit your{" "}
            <Link href={`/languages/${language.id}/generator`} className="underline">
              syllable patterns
            </Link>
            .{" "}
            <Link href={lexiconUrl(!misfitsOnly)} className="font-medium underline">
              {misfitsOnly ? "Show all words" : "Show only these"}
            </Link>
          </p>
        )}

        {words.length === 0 ? (
          <p className="py-6 text-center opacity-70">
            {filtered ? "No words match." : "No words yet. Add one above or import a CSV below."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-black/10 text-xs uppercase tracking-wide opacity-70 dark:border-white/15">
                <tr>
                  <th className="py-2 pr-3 font-medium">Word</th>
                  <th className="py-2 pr-3 font-medium">Pronunciation</th>
                  <th className="py-2 pr-3 font-medium">Part of speech</th>
                  <th className="py-2 pr-3 font-medium">Meaning</th>
                  <th className="py-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {words.map((w) => (
                  <tr key={w.id}>
                    <td className="py-2 pr-3">
                      <Link
                        href={`/languages/${language.id}/lexicon/${w.id}`}
                        className="font-ipa text-base font-semibold underline-offset-2 hover:underline"
                      >
                        {w.form}
                      </Link>
                      {w.unknownLetters.length > 0 && (
                        <span
                          className="ml-2 rounded bg-amber-100 px-1 text-xs text-amber-900 dark:bg-amber-900 dark:text-amber-100"
                          title={`Not in your spelling rules: ${w.unknownLetters.join(", ")}`}
                        >
                          ⚠ {w.unknownLetters.join(" ")}
                        </span>
                      )}
                    </td>
                    <td className="py-2 pr-3">
                      <span className={`font-ipa text-base ${w.derived ? "opacity-70" : ""}`}>
                        {w.ipa ? `/${w.ipa}/` : ""}
                      </span>
                      {w.problems.map((p) => (
                        <span key={describeProblem(p)} className="block text-xs text-amber-800 dark:text-amber-300">
                          ⚠ {describeProblem(p)}
                        </span>
                      ))}
                    </td>
                    <td className="py-2 pr-3 italic opacity-80">{w.partOfSpeech}</td>
                    <td className="py-2 pr-3">{w.gloss}</td>
                    <td className="py-2 text-xs opacity-70">{w.tags.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="grid gap-6 border-t border-black/10 pt-6 sm:grid-cols-2 dark:border-white/15">
        <div className="space-y-2">
          <h2 className="font-semibold">Import from CSV</h2>
          <ImportForm action={importWords.bind(null, language.id)} />
        </div>
        <div className="space-y-2">
          <h2 className="font-semibold">Export</h2>
          <p className="text-sm opacity-70">Download every word as a CSV file you can open in a spreadsheet.</p>
          <a
            href={`/languages/${language.id}/lexicon/export`}
            className="inline-block rounded-md border border-black/15 px-3 py-1 text-sm dark:border-white/20"
          >
            Download CSV
          </a>
        </div>
      </section>
    </div>
  );
}
