import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { consonantChart, vowelChart, type Chart } from "@/lib/inventory-chart";
import { alphabetComparator } from "@/lib/orthography";
import { phonotacticsOf } from "@/lib/phonotactics";
import { sharedLanguage } from "@/lib/sharing";

export default async function SharedSounds({ params }: PageProps<"/share/[id]/sounds">) {
  const { id } = await params;
  if (!(await sharedLanguage(id))) notFound();

  const [phonemes, generator] = await Promise.all([
    db.phoneme.findMany({ where: { languageId: id }, orderBy: { position: "asc" } }),
    db.wordGenerator.findUnique({ where: { languageId: id }, select: { categories: true, patterns: true, forbidden: true } }),
  ]);
  if (phonemes.length === 0) return <p className="opacity-70">No sounds have been added yet.</p>;

  const consonants = consonantChart(phonemes.filter((p) => p.kind === "CONSONANT").map((p) => p.ipa));
  const vowels = vowelChart(phonemes.filter((p) => p.kind === "VOWEL").map((p) => p.ipa));
  const compare = alphabetComparator(phonemes);
  const alphabet = [...phonemes].sort((a, b) => compare(a.spelling, b.spelling));
  const phonotactics = phonotacticsOf(generator);

  return (
    <div className="space-y-8">
      <div className="grid gap-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <ChartTable title="Consonants" chart={consonants} />
        <ChartTable title="Vowels" chart={vowels} />
      </div>

      <section className="space-y-2">
        <h2 className="font-semibold">Alphabet</h2>
        <ul className="flex flex-wrap gap-2">
          {alphabet.map((p) => (
            <li key={p.ipa} className="rounded-md border border-black/10 px-3 py-1.5 text-center dark:border-white/15">
              <span className="block font-ipa text-lg font-semibold">{p.spelling}</span>
              <span className="block font-ipa text-sm opacity-70">/{p.ipa}/</span>
            </li>
          ))}
        </ul>
      </section>

      {phonotactics && phonotactics.patterns.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-semibold">Syllables</h2>
          <p className="font-ipa">{phonotactics.patterns.join(", ")}</p>
          <ul className="space-y-0.5 text-sm">
            {phonotactics.categories.map((c) => (
              <li key={c.label}>
                <span className="font-semibold">{c.label}</span> = <span className="font-ipa">{c.members.join(" ")}</span>
              </li>
            ))}
          </ul>
          {phonotactics.forbidden.length > 0 && (
            <p className="text-sm">
              Never: <span className="font-ipa">{phonotactics.forbidden.join(", ")}</span>
            </p>
          )}
        </section>
      )}
    </div>
  );
}

function ChartTable({ title, chart }: { title: string; chart: Chart }) {
  if (chart.rows.length === 0 && chart.others.length === 0) return null;
  return (
    <section className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      {chart.rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="paradigm-table text-sm">
            <thead>
              <tr>
                <th />
                {chart.columns.map((c) => (
                  <th key={c} scope="col" className="text-xs">
                    {c}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {chart.rows.map((r) => (
                <tr key={r.label}>
                  <th scope="row" className="text-xs">
                    {r.label}
                  </th>
                  {r.cells.map((cell, i) => (
                    <td key={i} className="text-center font-ipa text-lg">
                      {cell.join(" ")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {chart.others.length > 0 && (
        <p className="text-sm">
          {chart.rows.length > 0 ? "Also: " : ""}
          <span className="font-ipa text-lg">{chart.others.join(" ")}</span>
        </p>
      )}
    </section>
  );
}
