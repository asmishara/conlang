"use server";

import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { inventoryInput } from "@/lib/inventory-input";

export type SaveResult = { ok: true } | { ok: false; error: string };

/** Replaces the language's whole inventory with the editor's current list. */
export async function saveInventory(languageId: string, phonemes: unknown): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You are signed out. Sign in again to save." };

  const language = await db.language.findFirst({
    where: { id: languageId, ownerId: userId },
    select: { id: true },
  });
  if (!language) return { ok: false, error: "Language not found." };

  const parsed = inventoryInput.safeParse(phonemes);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid inventory" };

  await db.$transaction([
    db.phoneme.deleteMany({ where: { languageId } }),
    db.phoneme.createMany({
      data: parsed.data.map((p, position) => ({ ...p, languageId, position })),
    }),
    db.language.update({ where: { id: languageId }, data: { updatedAt: new Date() } }),
  ]);

  revalidatePath(`/languages/${languageId}`);
  revalidatePath(`/languages/${languageId}/phonology`);
  return { ok: true };
}
