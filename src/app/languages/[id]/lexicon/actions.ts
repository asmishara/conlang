"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { parseLexiconCsv } from "@/lib/lexicon-csv";
import { parseWordForm } from "@/lib/word-input";

export type WordFormState = { error?: string; added?: string; count?: number };
export type ImportState = { error?: string; imported?: number; problems?: string[] };

/** Returns true when the signed-in user owns the language. */
async function ownsLanguage(languageId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const language = await db.language.findFirst({
    where: { id: languageId, ownerId: userId },
    select: { id: true },
  });
  return language !== null;
}

function touch(languageId: string) {
  revalidatePath(`/languages/${languageId}`);
  revalidatePath(`/languages/${languageId}/lexicon`);
  return db.language.update({ where: { id: languageId }, data: { updatedAt: new Date() } });
}

export async function createWord(
  languageId: string,
  prev: WordFormState,
  formData: FormData,
): Promise<WordFormState> {
  if (!(await ownsLanguage(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const parsed = parseWordForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid word", count: prev.count };

  await db.word.create({ data: { ...parsed.data, languageId } });
  await touch(languageId);
  return { added: parsed.data.form, count: (prev.count ?? 0) + 1 };
}

export async function updateWord(
  languageId: string,
  wordId: string,
  _prev: WordFormState,
  formData: FormData,
): Promise<WordFormState> {
  if (!(await ownsLanguage(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const parsed = parseWordForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid word" };

  const { count } = await db.word.updateMany({ where: { id: wordId, languageId }, data: parsed.data });
  if (count === 0) return { error: "That word no longer exists." };
  await touch(languageId);
  redirect(`/languages/${languageId}/lexicon`);
}

export async function deleteWord(languageId: string, wordId: string) {
  if (await ownsLanguage(languageId)) {
    await db.word.deleteMany({ where: { id: wordId, languageId } });
    await touch(languageId);
  }
  redirect(`/languages/${languageId}/lexicon`);
}

const MAX_IMPORT_BYTES = 900_000;

export async function importWords(
  languageId: string,
  _prev: ImportState,
  formData: FormData,
): Promise<ImportState> {
  if (!(await ownsLanguage(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > MAX_IMPORT_BYTES) return { error: "That file is too large. Split it into files under 900 KB." };

  const { words, errors } = parseLexiconCsv(await file.text());
  if (words.length === 0) return { error: errors[0] ?? "No words found in that file.", problems: errors.slice(1) };

  await db.word.createMany({ data: words.map((w) => ({ ...w, languageId })) });
  await touch(languageId);
  return { imported: words.length, problems: errors };
}
