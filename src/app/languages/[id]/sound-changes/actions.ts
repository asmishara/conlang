"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";

export type CreateState = { error?: string };
export type SaveResult = { ok: true } | { ok: false; error: string };

const nameInput = z.string().trim().min(1, "Give the rule set a name").max(100, "Names can be at most 100 characters");
const setInput = z.object({
  name: nameInput,
  rules: z.string().max(20000, "Rules can be at most 20,000 characters"),
});

async function ownsLanguage(languageId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const language = await db.language.findFirst({ where: { id: languageId, ownerId: userId }, select: { id: true } });
  return language !== null;
}

export async function createSoundChangeSet(
  languageId: string,
  _prev: CreateState,
  formData: FormData,
): Promise<CreateState> {
  if (!(await ownsLanguage(languageId))) return { error: "You can't edit this language. Try signing in again." };
  const name = nameInput.safeParse(String(formData.get("name") ?? "").trim() || "Sound changes");
  if (!name.success) return { error: name.error.issues[0].message };

  const set = await db.soundChangeSet.create({ data: { languageId, name: name.data } });
  revalidatePath(`/languages/${languageId}`, "layout");
  redirect(`/languages/${languageId}/sound-changes/${set.id}`);
}

/** Saves a rule set. Lines with problems are kept, so a half-written rule isn't lost; they're skipped when applied. */
export async function saveSoundChangeSet(languageId: string, setId: string, input: unknown): Promise<SaveResult> {
  if (!(await ownsLanguage(languageId))) return { ok: false, error: "You can't edit this language. Try signing in again." };
  const parsed = setInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const { count } = await db.soundChangeSet.updateMany({ where: { id: setId, languageId }, data: parsed.data });
  if (count === 0) return { ok: false, error: "This rule set no longer exists." };
  revalidatePath(`/languages/${languageId}/sound-changes`, "layout");
  return { ok: true };
}

export async function deleteSoundChangeSet(languageId: string, setId: string) {
  if (!(await ownsLanguage(languageId))) redirect("/signin");
  await db.soundChangeSet.deleteMany({ where: { id: setId, languageId } });
  revalidatePath(`/languages/${languageId}`, "layout");
  redirect(`/languages/${languageId}/sound-changes`);
}
