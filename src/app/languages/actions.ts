"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { parseLanguageForm } from "@/lib/language-input";
import { sharingChoices } from "@/lib/visibility";

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

export async function setVisibility(id: string, visibility: (typeof sharingChoices)[number]) {
  const userId = await currentUserId();
  if (!userId) redirect("/signin");
  if (!sharingChoices.includes(visibility)) return;

  await db.language.updateMany({ where: { id, ownerId: userId }, data: { visibility } });
  revalidatePath(`/languages/${id}`);
  revalidatePath(`/share/${id}`, "layout");
}
