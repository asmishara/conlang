import type { Prisma } from "@/generated/prisma/client";
import { currentUserId } from "@/auth";
import { db } from "./db";

/** Languages this user can edit: their own, and ones they've been invited to. */
export function editableBy(userId: string) {
  return { OR: [{ ownerId: userId }, { editors: { some: { userId } } }] } satisfies Prisma.LanguageWhereInput;
}

/** Whether the signed-in user can edit the language. */
export async function canEdit(languageId: string): Promise<boolean> {
  const userId = await currentUserId();
  if (!userId) return false;
  const language = await db.language.findFirst({ where: { id: languageId, ...editableBy(userId) }, select: { id: true } });
  return language !== null;
}
