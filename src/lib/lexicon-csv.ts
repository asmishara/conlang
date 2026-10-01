import Papa from "papaparse";
import { wordInput, type WordInput } from "./word-input";

export const MAX_IMPORT_ROWS = 5000;

/** Header names accepted on import, mapped to word fields. */
const headerAliases: Record<string, keyof WordInput> = {
  word: "form",
  form: "form",
  spelling: "form",
  gloss: "gloss",
  meaning: "gloss",
  definition: "gloss",
  english: "gloss",
  pronunciation: "pronunciation",
  ipa: "pronunciation",
  pos: "partOfSpeech",
  "part of speech": "partOfSpeech",
  part_of_speech: "partOfSpeech",
  partofspeech: "partOfSpeech",
  etymology: "etymology",
  notes: "notes",
  tags: "tags",
};

export type ImportResult = {
  words: WordInput[];
  errors: string[];
};

/** Parses an uploaded CSV into validated words, collecting per-row errors. */
export function parseLexiconCsv(text: string): ImportResult {
  const parsed = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, ""), {
    header: true,
    skipEmptyLines: "greedy",
    transformHeader: (h) => h.trim().toLowerCase(),
  });

  const fields = parsed.meta.fields ?? [];
  const mapped = new Map(fields.map((f) => [f, headerAliases[f]]));
  const has = (key: keyof WordInput) => [...mapped.values()].includes(key);
  if (!has("form") || !has("gloss")) {
    return {
      words: [],
      errors: ['The first row must be a header with at least "word" and "gloss" columns.'],
    };
  }

  const errors: string[] = parsed.errors.slice(0, 5).map((e) => `Row ${(e.row ?? 0) + 2}: ${e.message}`);
  if (parsed.data.length > MAX_IMPORT_ROWS) {
    return { words: [], errors: [`That file has ${parsed.data.length} rows; the limit is ${MAX_IMPORT_ROWS}.`] };
  }

  const words: WordInput[] = [];
  parsed.data.forEach((row, i) => {
    const values: Record<string, string> = {
      form: "",
      gloss: "",
      pronunciation: "",
      partOfSpeech: "",
      etymology: "",
      notes: "",
      tags: "",
    };
    for (const [header, key] of mapped) {
      if (key && row[header] != null) values[key] = String(row[header]);
    }
    const result = wordInput.safeParse(values);
    if (result.success) words.push(result.data);
    else if (errors.length < 20) errors.push(`Row ${i + 2}: ${result.error.issues[0]?.message}`);
  });
  return { words, errors };
}

/** Serializes words to CSV with the same headers the importer reads. */
export function lexiconToCsv(
  words: {
    form: string;
    pronunciation: string;
    partOfSpeech: string | null;
    gloss: string;
    etymology: string | null;
    notes: string | null;
    tags: string[];
  }[],
): string {
  const rows = words.map((w) => ({
    word: w.form,
    pronunciation: w.pronunciation,
    part_of_speech: w.partOfSpeech ?? "",
    gloss: w.gloss,
    etymology: w.etymology ?? "",
    notes: w.notes ?? "",
    tags: w.tags.join(", "),
  }));
  // Leading BOM so Excel opens the file as UTF-8.
  return (
    "\uFEFF" +
    Papa.unparse(rows, {
      columns: ["word", "pronunciation", "part_of_speech", "gloss", "etymology", "notes", "tags"],
      escapeFormulae: true,
    })
  );
}
