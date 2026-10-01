"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { parseLanguageForm } from "@/lib/language-input";

export type FormState = { error?: string };

export async function createLanguage(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const userId = await currentUserId();
  if (!userId) redirect("/signin?callbackUrl=/languages");

  const parsed = parseLanguageForm(formData);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Invalid input" };

  const language = await db.language.create({
    data: { ...parsed.data, ownerId: userId },
  });
  revalidatePath("/languages");
  redirect(`/languages/${language.id}`);
}

export async function deleteLanguage(id: string) {
  const userId = await currentUserId();
  if (!userId) redirect("/signin");

  // deleteMany scopes the delete to the owner, so other users' ids are a no-op.
  await db.language.deleteMany({ where: { id, ownerId: userId } });
  revalidatePath("/languages");
  redirect("/languages");
}
