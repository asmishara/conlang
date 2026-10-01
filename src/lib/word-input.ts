import { z } from "zod";

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((s) => (s ? s.normalize("NFC") : null));

/** Splits "noun, Food , food" into ["noun", "food"]. */
export function parseTags(raw: string): string[] {
  const seen = new Set<string>();
  for (const t of raw.split(/[,;]/)) {
    const tag = t.trim().toLowerCase();
    if (tag) seen.add(tag);
  }
  return [...seen].slice(0, 20);
}

export const wordInput = z.object({
  form: z.string().trim().min(1, "Word is required").max(100).normalize("NFC"),
  gloss: z.string().trim().min(1, "Meaning is required").max(300),
  pronunciation: optionalText(100).transform((s) => (s ? s.replace(/^[/[]+|[/\]]+$/g, "") || null : null)),
  partOfSpeech: optionalText(40).transform((s) => s?.toLowerCase() ?? null),
  etymology: optionalText(2000),
  notes: optionalText(5000),
  tags: z.string().max(500).transform(parseTags),
});

export type WordInput = z.infer<typeof wordInput>;

/** Reads the add/edit word form. */
export function parseWordForm(formData: FormData) {
  const get = (k: string) => {
    const v = formData.get(k);
    return typeof v === "string" ? v : "";
  };
  return wordInput.safeParse({
    form: get("form"),
    gloss: get("gloss"),
    pronunciation: get("pronunciation"),
    partOfSpeech: get("partOfSpeech"),
    etymology: get("etymology"),
    notes: get("notes"),
    tags: get("tags"),
  });
}
