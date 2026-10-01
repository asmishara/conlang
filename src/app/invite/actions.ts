"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { hashInviteToken } from "@/lib/invite-token";

/** Uses up an invite link and makes the signed-in user an editor of its language. */
export async function acceptInvite(token: string) {
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/invite/${encodeURIComponent(token)}`);

  const invite = await db.languageInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    include: { language: { select: { ownerId: true, editors: { where: { userId }, select: { userId: true } } } } },
  });
  // The page explains expired and used links.
  if (!invite || invite.expiresAt <= new Date()) redirect(`/invite/${encodeURIComponent(token)}`);

  // The owner and existing editors don't use up the link.
  const alreadyIn = invite.language.ownerId === userId || invite.language.editors.length > 0;
  if (!alreadyIn) {
    await db.$transaction(async (tx) => {
      const { count } = await tx.languageInvite.deleteMany({ where: { id: invite.id, expiresAt: { gt: new Date() } } });
      if (count === 0) return;
      await tx.languageEditor.upsert({
        where: { languageId_userId: { languageId: invite.languageId, userId } },
        create: { languageId: invite.languageId, userId },
        update: {},
      });
    });
  }
  revalidatePath("/languages");
  redirect(`/languages/${invite.languageId}`);
}
