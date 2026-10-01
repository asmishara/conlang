"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUserId } from "@/auth";
import { canEdit, editableBy } from "@/lib/access";
import { planDaughter } from "@/lib/daughter";
import { db } from "@/lib/db";
import { languageClassSource } from "@/lib/language-classes";
import { compileSoundChanges, inventoryClasses } from "@/lib/sound-changes";

export type CreateState = { error?: string };
export type SaveResult = { ok: true } | { ok: false; error: string };

const nameInput = z.string().trim().min(1, "Give the rule set a name").max(100, "Names can be at most 100 characters");
const setInput = z.object({
  name: nameInput,
  rules: z.string().max(20000, "Rules can be at most 20,000 characters"),
});

export async function createSoundChangeSet(
  languageId: string,
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  if (!(await canEdit(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const name = nameInput.safeParse(String(formData.get("name") ?? "").trim() || "Sound changes");
  if (!name.success) return { error: name.error.issues[0].message };

  const set = await db.soundChangeSet.create({ data: { languageId, name: name.data } });
  revalidatePath(`/languages/${languageId}`, "layout");
  redirect(`/languages/${languageId}/sound-changes/${set.id}`);
}

/** Saves a rule set. Lines with problems are kept, so a half-written rule isn't lost; they're skipped when applied. */
export async function saveSoundChangeSet(languageId: string, setId: string, input: unknown): Promise<SaveResult> {
  if (!(await canEdit(languageId))) return { ok: false, error: "You can't edit this language. Try signing in again." };
  const parsed = setInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { count } = await db.soundChangeSet.updateMany({ where: { id: setId, languageId }, data: parsed.data });
  if (count === 0) return { ok: false, error: "This rule set no longer exists." };
  revalidatePath(`/languages/${languageId}/sound-changes`, "layout");
  return { ok: true };
}

export async function deleteSoundChangeSet(languageId: string, setId: string) {
  if (!(await canEdit(languageId))) redirect("/signin");
  await db.soundChangeSet.deleteMany({ where: { id: setId, languageId } });
  revalidatePath(`/languages/${languageId}`, "layout");
  redirect(`/languages/${languageId}/sound-changes`);
}

/**
 * Makes a new language from this one's words run through the saved rules.
 * The daughter starts private, with its own inventory and lexicon; each
 * word links back to the word it came from.
 */
export async function createDaughterLanguage(
  languageId: string,
  setId: string,
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  const userId = await currentUserId();
  if (!userId) return { error: "You can't edit this language. Try signing in again." };
  const set = await db.soundChangeSet.findFirst({
    where: { id: setId, languageId, language: editableBy(userId) },
    include: { language: { select: { name: true } } },
  });
  if (!set) return { error: "This rule set no longer exists." };
  const name = z
    .string()
    .trim()
    .min(1, "Give the new language a name")
    .max(100, "Names can be at most 100 characters")
    .safeParse(formData.get("name") ?? "");
  if (!name.success) return { error: name.error.issues[0].message };

  const [{ phonemes, categories }, words] = await Promise.all([
    languageClassSource(languageId),
    db.word.findMany({
      where: { languageId },
      orderBy: { createdAt: "asc" },
      select: { id: true, form: true, pronunciation: true, gloss: true, partOfSpeech: true, tags: true },
    }),
  ]);
  const compiled = compileSoundChanges(
    set.rules,
    inventoryClasses(phonemes, categories),
    phonemes.map((p) => p.ipa),
  );
  const plan = planDaughter(set.language.name, phonemes, words, compiled);

  const daughter = await db.$transaction(async (tx) => {
    const language = await tx.language.create({
      data: { ownerId: userId, name: name.data, parentId: languageId },
    });
    await tx.phoneme.createMany({ data: plan.phonemes.map((p) => ({ ...p, languageId: language.id })) });
    await tx.word.createMany({ data: plan.words.map((w) => ({ ...w, languageId: language.id })) });
    return language;
  });
  revalidatePath("/languages");
  revalidatePath(`/languages/${languageId}`, "layout");
  redirect(`/languages/${daughter.id}`);
}
