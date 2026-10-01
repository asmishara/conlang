"use client";

import { useMemo, useState, useTransition } from "react";
import {
  chartSymbols,
  consonantPlaces,
  consonantRows,
  otherConsonants,
  vowelBackness,
  vowelRows,
  type Cell,
} from "@/lib/ipa";
import { segment } from "@/lib/orthography";
import { saveInventory } from "./actions";

type Kind = "CONSONANT" | "VOWEL";
type Phoneme = { ipa: string; kind: Kind; spelling: string };

const border = "border-black/10 dark:border-white/15";
const input = `rounded-md border ${border} bg-transparent px-2 py-1`;

export function PhonologyEditor({ languageId, initial }: { languageId: string; initial: Phoneme[] }) {
  const [phonemes, setPhonemes] = useState<Phoneme[]>(initial);
  const [saved, setSaved] = useState<Phoneme[]>(initial);
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, startTransition] = useTransition();

  const selected = useMemo(() => new Set(phonemes.map((p) => p.ipa)), [phonemes]);
  const dirty = JSON.stringify(phonemes) !== JSON.stringify(saved);

  function toggle(ipa: string, kind: Kind) {
    setStatus(null);
    setPhonemes((list) =>
      list.some((p) => p.ipa === ipa)
        ? list.filter((p) => p.ipa !== ipa)
        : [...list, { ipa, kind, spelling: ipa }],
    );
  }

  function setSpelling(ipa: string, spelling: string) {
    setStatus(null);
    setPhonemes((list) => list.map((p) => (p.ipa === ipa ? { ...p, spelling } : p)));
  }

  function save() {
    // Blank spellings are saved as the IPA symbol; mirror that locally.
    const toSave = phonemes.map((p) => ({ ...p, spelling: p.spelling.trim() || p.ipa }));
    startTransition(async () => {
      const result = await saveInventory(languageId, toSave);
      if (result.ok) {
        setPhonemes(toSave);
        setSaved(toSave);
        setStatus({ ok: true, text: "Saved" });
      } else {
        setStatus({ ok: false, text: result.error });
      }
    });
  }

  const consonants = phonemes.filter((p) => p.kind === "CONSONANT");
  const vowels = phonemes.filter((p) => p.kind === "VOWEL");

  return (
    <div className="space-y-10">
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Consonants</h2>
        <div className="overflow-x-auto">
          <table className="border-collapse text-center text-sm">
            <thead>
              <tr>
                <th />
                {consonantPlaces.map((place) => (
                  <th key={place} className="px-0.5 pb-1 text-[11px] font-normal opacity-70">
                    {place}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {consonantRows.map((row) => (
                <tr key={row.manner}>
                  <th className="whitespace-nowrap pr-2 text-left text-xs font-normal opacity-70">
                    {row.manner}
                  </th>
                  {row.cells.map((cell, i) => (
                    <ChartCell key={i} cell={cell} kind="CONSONANT" selected={selected} onToggle={toggle} />
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex flex-wrap items-center gap-1 text-sm">
          <span className="mr-1 text-xs opacity-70">Other</span>
          {otherConsonants.map((s) => (
            <SymbolButton key={s} symbol={s} on={selected.has(s)} onClick={() => toggle(s, "CONSONANT")} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Vowels</h2>
        <table className="border-collapse text-center text-sm">
          <thead>
            <tr>
              <th />
              {vowelBackness.map((b) => (
                <th key={b} className="px-1 pb-1 text-xs font-normal opacity-70">
                  {b}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {vowelRows.map((row) => (
              <tr key={row.height}>
                <th className="whitespace-nowrap pr-2 text-left text-xs font-normal opacity-70">
                  {row.height}
                </th>
                {row.cells.map((cell, i) => (
                  <ChartCell key={i} cell={cell} kind="VOWEL" selected={selected} onToggle={toggle} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <CustomSoundForm
        existing={selected}
        onAdd={(ipa, kind) => {
          if (!selected.has(ipa)) toggle(ipa, kind);
        }}
      />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Spelling</h2>
        {phonemes.length === 0 ? (
          <p className="text-sm opacity-70">Select some sounds above to set their spellings.</p>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            <SpellingList title="Consonants" list={consonants} onChange={setSpelling} onRemove={toggle} />
            <SpellingList title="Vowels" list={vowels} onChange={setSpelling} onRemove={toggle} />
          </div>
        )}
      </section>

      <SpellingPreview phonemes={phonemes} />

      <div className="sticky bottom-0 flex items-center gap-3 border-t border-black/10 bg-background py-3 dark:border-white/15">
        <button
          type="button"
          onClick={save}
          disabled={pending || !dirty}
          className="rounded-md bg-foreground px-4 py-2 text-background disabled:opacity-50"
        >
          {pending ? "Saving…" : "Save changes"}
        </button>
        <span className="text-sm opacity-70">
          {phonemes.length} sound{phonemes.length === 1 ? "" : "s"}
        </span>
        {status && (
          <span role="status" className={`text-sm ${status.ok ? "text-green-700 dark:text-green-400" : "text-red-600"}`}>
            {status.text}
          </span>
        )}
        {!status && dirty && <span className="text-sm opacity-70">Unsaved changes</span>}
      </div>
    </div>
  );
}

function ChartCell({
  cell,
  kind,
  selected,
  onToggle,
}: {
  cell: Cell;
  kind: Kind;
  selected: Set<string>;
  onToggle: (ipa: string, kind: Kind) => void;
}) {
  return (
    <td className={`border ${border} p-0.5`}>
      <div className="flex justify-center gap-0.5">
        {cell.map((s, i) =>
          s ? (
            <SymbolButton key={s} symbol={s} on={selected.has(s)} onClick={() => onToggle(s, kind)} />
          ) : (
            <span key={i} className="inline-block w-7" />
          ),
        )}
      </div>
    </td>
  );
}

function SymbolButton({ symbol, on, onClick }: { symbol: string; on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      aria-label={`/${symbol}/`}
      onClick={onClick}
      className={`h-7 min-w-7 rounded px-0.5 font-ipa text-lg leading-none ${
        on ? "bg-foreground text-background" : "hover:bg-black/5 dark:hover:bg-white/10"
      }`}
    >
      {symbol}
    </button>
  );
}

function CustomSoundForm({
  existing,
  onAdd,
}: {
  existing: Set<string>;
  onAdd: (ipa: string, kind: Kind) => void;
}) {
  const [ipa, setIpa] = useState("");
  const [kind, setKind] = useState<Kind>("CONSONANT");
  const symbol = ipa.trim().normalize("NFC");
  const duplicate = existing.has(symbol);

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Other sounds</h2>
      <p className="text-sm opacity-70">
        Add anything not on the charts, like long vowels (aː), aspirated stops (pʰ) or clicks (ǀ).
      </p>
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!symbol || duplicate) return;
          onAdd(symbol, chartSymbols.get(symbol) ?? kind);
          setIpa("");
        }}
      >
        <input
          aria-label="IPA symbol"
          value={ipa}
          onChange={(e) => setIpa(e.target.value)}
          maxLength={16}
          placeholder="e.g. aː"
          className={`${input} w-28 font-ipa`}
        />
        <select aria-label="Kind" value={kind} onChange={(e) => setKind(e.target.value as Kind)} className={input}>
          <option value="CONSONANT">Consonant</option>
          <option value="VOWEL">Vowel</option>
        </select>
        <button type="submit" disabled={!symbol || duplicate} className={`${input} disabled:opacity-50`}>
          Add
        </button>
        {duplicate && <span className="text-sm opacity-70">Already in the inventory</span>}
      </form>
    </section>
  );
}

function SpellingList({
  title,
  list,
  onChange,
  onRemove,
}: {
  title: string;
  list: Phoneme[];
  onChange: (ipa: string, spelling: string) => void;
  onRemove: (ipa: string, kind: Kind) => void;
}) {
  if (list.length === 0) return null;
  return (
    <div>
      <h3 className="mb-2 text-sm font-medium opacity-70">{title}</h3>
      <ul className="space-y-1">
        {list.map((p) => (
          <li key={p.ipa} className="flex items-center gap-2">
            <span className="w-14 font-ipa text-lg">/{p.ipa}/</span>
            <span aria-hidden className="opacity-50">→</span>
            <input
              aria-label={`Spelling of /${p.ipa}/`}
              value={p.spelling}
              onChange={(e) => onChange(p.ipa, e.target.value)}
              maxLength={16}
              className={`${input} w-24`}
            />
            <button
              type="button"
              onClick={() => onRemove(p.ipa, p.kind)}
              className="text-sm underline opacity-60 hover:opacity-100"
              aria-label={`Remove /${p.ipa}/`}
            >
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SpellingPreview({ phonemes }: { phonemes: Phoneme[] }) {
  const [text, setText] = useState("");
  // A blank spelling falls back to the IPA symbol, matching what gets saved.
  const rules = phonemes.map((p) => ({ ipa: p.ipa, spelling: p.spelling.trim() || p.ipa }));
  const segments = segment(text, rules);
  const unknown = [...new Set(segments.filter((s) => !s.known).map((s) => s.ipa))];

  return (
    <section className="space-y-2">
      <h2 className="text-lg font-semibold">Try it</h2>
      <label className="block space-y-1 text-sm">
        <span className="opacity-70">Type a word in IPA to see how it is spelled</span>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="e.g. t͡ʃaŋ"
          className={`${input} block w-full max-w-sm font-ipa text-lg`}
        />
      </label>
      {text.trim() && (
        <p className="text-xl" aria-live="polite">
          {segments.map((s, i) =>
            s.known ? (
              <span key={i}>{s.spelling}</span>
            ) : (
              <mark key={i} className="bg-red-200 dark:bg-red-900" title="Not in the inventory">
                {s.spelling}
              </mark>
            ),
          )}
        </p>
      )}
      {unknown.length > 0 && (
        <p className="text-sm text-red-600">Not in the inventory: {unknown.map((u) => `/${u}/`).join(", ")}</p>
      )}
    </section>
  );
}
