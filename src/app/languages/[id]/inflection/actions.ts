"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { cellKey, inflect } from "@/lib/inflection";
import { languageClasses } from "@/lib/language-classes";
import {
  cleanIrregularForms,
  moveIrregularForms,
  paradigmInput,
  partOfSpeechInput,
  ruleProblems,
  storedParadigm,
} from "@/lib/paradigm-input";

export type CreateState = { error?: string };
export type SaveResult = { ok: true } | { ok: false; error: string };

async function ownsLanguage(languageId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const language = await db.language.findFirst({ where: { id: languageId, ownerId: userId }, select: { id: true } });
  return language !== null;
}

function refresh(languageId: string) {
  revalidatePath(`/languages/${languageId}`, "layout");
}

export async function createParadigm(languageId: string, _prev: CreateState, formData: FormData): Promise<CreateState> {
  if (!(await ownsLanguage(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const name = String(formData.get("name") ?? "").trim();
  const pos = partOfSpeechInput.safeParse(formData.get("partOfSpeech") ?? "");
  if (!pos.success) return { error: pos.error.issues[0].message };

  // Start with singular and plural, so there's something to fill in.
  const paradigm = await db.paradigm.create({
    data: {
      languageId,
      name: name.slice(0, 100) || `${pos.data[0].toUpperCase()}${pos.data.slice(1)} forms`,
      partOfSpeech: pos.data,
      dimensions: [{ name: "Number", values: ["singular", "plural"] }],
      rules: { [cellKey(["singular"])]: "~" },
    },
  });
  refresh(languageId);
  redirect(`/languages/${languageId}/inflection/${paradigm.id}`);
}

const movesInput = z.record(z.string(), z.string()).optional();

/**
 * Saves a table. `moves` maps each saved cell that is still in the table to
 * its new key (after renaming values or adding a dimension), so words'
 * irregular forms follow their cells.
 */
export async function saveParadigm(
  languageId: string,
  paradigmId: string,
  input: unknown,
  moves?: unknown,
): Promise<SaveResult> {
  if (!(await ownsLanguage(languageId))) return { ok: false, error: "You can't edit this language. Try signing in again." };
  const parsed = paradigmInput.safeParse(input);
  const parsedMoves = movesInput.safeParse(moves);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };
  if (!parsedMoves.success) return { ok: false, error: "Something went wrong. Reload the page and try again." };

  const problems = ruleProblems(parsed.data.dimensions, parsed.data.rules, await languageClasses(languageId));
  if (problems.length > 0) return { ok: false, error: problems[0] };

  const saved = await db.$transaction(async (tx) => {
    const { count } = await tx.paradigm.updateMany({ where: { id: paradigmId, languageId }, data: parsed.data });
    if (count === 0) return false;
    const forms = await tx.irregularForm.findMany({ where: { paradigmId }, select: { wordId: true, cell: true, form: true } });
    const moved = moveIrregularForms(forms, parsed.data.dimensions, parsedMoves.data);
    const unchanged = moved.length === forms.length && moved.every((f, i) => f.cell === forms[i].cell);
    if (!unchanged) {
      await tx.irregularForm.deleteMany({ where: { paradigmId } });
      await tx.irregularForm.createMany({ data: moved.map((f) => ({ ...f, paradigmId })), skipDuplicates: true });
    }
    return true;
  });
  if (!saved) return { ok: false, error: "This table no longer exists." };
  refresh(languageId);
  return { ok: true };
}

/** Saves one word's irregular forms for one table, replacing what was there. */
export async function saveIrregularForms(
  languageId: string,
  wordId: string,
  paradigmId: string,
  input: unknown,
): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You can't edit this language. Try signing in again." };
  const owned = { languageId, language: { ownerId: userId } };
  const [word, paradigm] = await Promise.all([
    db.word.findFirst({ where: { id: wordId, ...owned }, select: { form: true } }),
    db.paradigm.findFirst({ where: { id: paradigmId, ...owned } }),
  ]);
  if (!word || !paradigm) return { ok: false, error: "This word or table no longer exists." };

  const cells = inflect(word.form, storedParadigm(paradigm), await languageClasses(languageId));
  const forms = cleanIrregularForms(input, cells);
  if (!forms) return { ok: false, error: "Forms can be at most 100 characters." };

  await db.$transaction([
    db.irregularForm.deleteMany({ where: { wordId, paradigmId } }),
    db.irregularForm.createMany({
      data: Object.entries(forms).map(([cell, form]) => ({ wordId, paradigmId, cell, form })),
    }),
  ]);
  revalidatePath(`/languages/${languageId}/lexicon/${wordId}`);
  return { ok: true };
}

export async function deleteParadigm(languageId: string, paradigmId: string) {
  if (!(await ownsLanguage(languageId))) redirect("/signin");
  await db.paradigm.deleteMany({ where: { id: paradigmId, languageId } });
  refresh(languageId);
  redirect(`/languages/${languageId}/inflection`);
}
