import { z } from "zod";
import { cellKey, cellsOf, parseRule, type Cell, type Dimension, type SoundClasses } from "./inflection";

const label = (what: string) => z.string().trim().normalize("NFC").min(1, `${what} can't be empty`).max(40);

export const partOfSpeechInput = z
  .string()
  .trim()
  .min(1, "Choose the part of speech it's for")
  .max(40)
  .transform((s) => s.toLowerCase());

export const paradigmInput = z
  .object({
    name: z.string().trim().min(1, "Give the table a name").max(100),
    partOfSpeech: partOfSpeechInput,
    dimensions: z
      .array(
        z.object({
          name: label("A dimension's name"),
          values: z.array(label("A value")).min(1, "Each dimension needs at least one value").max(20),
        }),
      )
      .min(1, "Add at least one dimension")
      .max(3, "A table can have at most three dimensions"),
    rules: z.record(z.string(), z.string().max(300)),
  })
  .superRefine((p, ctx) => {
    for (const d of p.dimensions) {
      const seen = new Set<string>();
      for (const v of d.values) {
        if (seen.has(v)) ctx.addIssue({ code: "custom", message: `${d.name} lists “${v}” twice` });
        seen.add(v);
      }
    }
  })
  .transform((p) => {
    // Keep only rules for cells that exist, without blanks.
    const rules: Record<string, string> = {};
    for (const values of cellsOf(p.dimensions)) {
      const rule = p.rules[cellKey(values)]?.trim().normalize("NFC");
      if (rule) rules[cellKey(values)] = rule;
    }
    return { ...p, rules };
  });

export type ParadigmInput = z.infer<typeof paradigmInput>;

/** Rules that don't parse, naming their cell. */
export function ruleProblems(dimensions: Dimension[], rules: Record<string, string>, classes: SoundClasses) {
  const problems: string[] = [];
  for (const values of cellsOf(dimensions)) {
    const parsed = parseRule(rules[cellKey(values)] ?? "", classes);
    if ("error" in parsed) problems.push(`${values.join(" ")}: ${parsed.error}`);
  }
  return problems;
}

/** Reads a saved paradigm's JSON columns. */
export function storedParadigm(row: { dimensions: unknown; rules: unknown }): {
  dimensions: Dimension[];
  rules: Record<string, string>;
} {
  const dimensions = Array.isArray(row.dimensions)
    ? row.dimensions.filter(
        (d): d is Dimension =>
          typeof d?.name === "string" && Array.isArray(d?.values) && d.values.every((v: unknown) => typeof v === "string"),
      )
    : [];
  const rules: Record<string, string> = {};
  if (row.rules && typeof row.rules === "object" && !Array.isArray(row.rules)) {
    for (const [k, v] of Object.entries(row.rules)) if (typeof v === "string") rules[k] = v;
  }
  return { dimensions, rules };
}

const NO_FORM = new Set(["-", "–", "—"]);

/**
 * Cleans a word's irregular forms for saving: only cells the table has,
 * a dash for "no form", and nothing for blank cells or forms the rule
 * already gives. Returns null when the input isn't a map of short strings.
 */
export function cleanIrregularForms(input: unknown, cells: Cell[]): Record<string, string> | null {
  const parsed = z.record(z.string(), z.string().max(100)).safeParse(input);
  if (!parsed.success) return null;
  const forms: Record<string, string> = {};
  for (const c of cells) {
    const key = cellKey(c.values);
    const raw = parsed.data[key]?.trim().normalize("NFC");
    if (!raw) continue;
    const form = NO_FORM.has(raw) ? "" : raw;
    if (form !== (c.regular ?? "")) forms[key] = form;
  }
  return forms;
}

/**
 * Where a word's irregular forms go after a table is edited. `moves` maps
 * each old cell key that still exists to its new key; forms in other cells
 * are dropped. Without `moves`, forms stay in cells that still exist.
 */
export function moveIrregularForms<F extends { cell: string }>(
  forms: F[],
  dimensions: Dimension[],
  moves?: Record<string, string>,
): F[] {
  const cells = new Set(cellsOf(dimensions).map(cellKey));
  return forms.flatMap((f) => {
    const cell = moves ? moves[f.cell] : f.cell;
    return cell !== undefined && cells.has(cell) ? [{ ...f, cell }] : [];
  });
}
