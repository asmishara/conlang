"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { INVITE_DAYS, MAX_PENDING_INVITES, newInviteToken } from "@/lib/invite-token";
import { db } from "@/lib/db";

export type InviteState = { token?: string; error?: string };

/** The signed-in user's id when they own the language, otherwise null. */
async function ownerOf(languageId: string): Promise<string | null> {
  const userId = await currentUserId();
  if (!userId) return null;
  const language = await db.language.findFirst({ where: { id: languageId, ownerId: userId }, select: { id: true } });
  return language ? userId : null;
}

/** Makes a one-time invite link. The token is returned once and only its hash is kept. */
export async function createInvite(languageId: string): Promise<InviteState> {
  if (!(await ownerOf(languageId))) return { error: "Only the owner can invite editors." };
  const now = new Date();
  await db.languageInvite.deleteMany({ where: { languageId, expiresAt: { lte: now } } });
  const pending = await db.languageInvite.count({ where: { languageId } });
  if (pending >= MAX_PENDING_INVITES) {
    return { error: `There are already ${MAX_PENDING_INVITES} unused links. Cancel some first.` };
  }

  const { token, tokenHash } = newInviteToken();
  await db.languageInvite.create({
    data: { languageId, tokenHash, expiresAt: new Date(now.getTime() + INVITE_DAYS * 24 * 60 * 60 * 1000) },
  });
  revalidatePath(`/languages/${languageId}`);
  return { token };
}

export async function cancelInvite(languageId: string, inviteId: string) {
  if (!(await ownerOf(languageId))) redirect("/signin");
  await db.languageInvite.deleteMany({ where: { id: inviteId, languageId } });
  revalidatePath(`/languages/${languageId}`);
}

export async function removeEditor(languageId: string, userId: string) {
  if (!(await ownerOf(languageId))) redirect("/signin");
  await db.languageEditor.deleteMany({ where: { languageId, userId } });
  revalidatePath(`/languages/${languageId}`);
}

/** Stops editing someone else's language. */
export async function leaveLanguage(languageId: string) {
  const userId = await currentUserId();
  if (!userId) redirect("/signin");
  await db.languageEditor.deleteMany({ where: { languageId, userId } });
  revalidatePath("/languages");
  redirect("/languages");
}
