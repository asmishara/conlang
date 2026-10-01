import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { hashInviteToken } from "@/lib/invite-token";
import { acceptInvite } from "../actions";

export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/invite/${encodeURIComponent(token)}`);

  const invite = await db.languageInvite.findUnique({
    where: { tokenHash: hashInviteToken(token) },
    select: {
      expiresAt: true,
      language: {
        select: {
          id: true,
          name: true,
          ownerId: true,
          owner: { select: { name: true, email: true } },
          editors: { where: { userId }, select: { userId: true } },
        },
      },
    },
  });

  if (!invite || invite.expiresAt <= new Date()) {
    return (
      <div className="max-w-prose space-y-3">
        <h1 className="text-2xl font-semibold">This invite link doesn&apos;t work</h1>
        <p className="opacity-80">
          It has already been used or has expired. Ask the person who sent it for a new one.
        </p>
        <Link href="/languages" className="underline">
          Go to your languages
        </Link>
      </div>
    );
  }

  const { language } = invite;
  if (language.ownerId === userId || language.editors.length > 0) redirect(`/languages/${language.id}`);
  const owner = language.owner.name ?? language.owner.email ?? "Someone";

  return (
    <div className="max-w-prose space-y-4">
      <h1 className="text-2xl font-semibold">Help edit {language.name}</h1>
      <p className="opacity-80">
        {owner} invited you to edit {language.name}: its sounds, dictionary, grammar and everything else. Only{" "}
        {owner} can delete it or change who can see it.
      </p>
      <form action={acceptInvite.bind(null, token)}>
        <button type="submit" className="rounded-md bg-foreground px-4 py-2 text-background">
          Accept and start editing
        </button>
      </form>
    </div>
  );
}
