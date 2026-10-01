"use server";

import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { generatorInput } from "@/lib/generator-input";

export type SaveResult = { ok: true } | { ok: false; error: string };

export async function saveGeneratorSettings(languageId: string, settings: unknown): Promise<SaveResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You are signed out. Sign in again to save." };

  const language = await db.language.findFirst({
    where: { id: languageId, ownerId: userId },
    select: { id: true },
  });
  if (!language) return { ok: false, error: "Language not found." };

  const parsed = generatorInput.safeParse(settings);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid settings" };

  await db.wordGenerator.upsert({
    where: { languageId },
    create: { languageId, ...parsed.data },
    update: parsed.data,
  });
  revalidatePath(`/languages/${languageId}/generator`);
  return { ok: true };
}
