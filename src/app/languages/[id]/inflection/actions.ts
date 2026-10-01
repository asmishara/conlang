"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { cellKey } from "@/lib/inflection";
import { languageClasses } from "@/lib/language-classes";
import { paradigmInput, partOfSpeechInput, ruleProblems } from "@/lib/paradigm-input";

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

export async function saveParadigm(languageId: string, paradigmId: string, input: unknown): Promise<SaveResult> {
  if (!(await ownsLanguage(languageId))) return { ok: false, error: "You can't edit this language. Try signing in again." };
  const parsed = paradigmInput.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0].message };

  const problems = ruleProblems(parsed.data.dimensions, parsed.data.rules, await languageClasses(languageId));
  if (problems.length > 0) return { ok: false, error: problems[0] };

  const { count } = await db.paradigm.updateMany({ where: { id: paradigmId, languageId }, data: parsed.data });
  if (count === 0) return { ok: false, error: "This table no longer exists." };
  refresh(languageId);
  return { ok: true };
}

export async function deleteParadigm(languageId: string, paradigmId: string) {
  if (!(await ownsLanguage(languageId))) redirect("/signin");
  await db.paradigm.deleteMany({ where: { id: paradigmId, languageId } });
  refresh(languageId);
  redirect(`/languages/${languageId}/inflection`);
}
