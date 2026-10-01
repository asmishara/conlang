import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { PhonologyEditor } from "./phonology-editor";

export default async function PhonologyPage({ params }: PageProps<"/languages/[id]/phonology">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}/phonology`);

  const language = await db.language.findFirst({
    where: { id, ownerId: userId },
    select: {
      id: true,
      name: true,
      phonemes: { orderBy: { position: "asc" }, select: { ipa: true, kind: true, spelling: true } },
    },
  });
  if (!language) notFound();

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <Link href={`/languages/${language.id}`} className="text-sm underline opacity-70">
          ← {language.name}
        </Link>
        <h1 className="text-2xl font-semibold">Phonology</h1>
        <p className="max-w-prose text-sm opacity-70">
          Pick the sounds your language uses, then choose how each one is spelled.
        </p>
      </header>
      <PhonologyEditor languageId={language.id} initial={language.phonemes} />
    </div>
  );
}
