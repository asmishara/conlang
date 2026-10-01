import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { INVITE_DAYS } from "@/lib/invite-token";
import { deleteLanguage, setVisibility } from "../actions";
import { CopyLinkButton } from "./copy-link";
import { cancelInvite, createInvite, leaveLanguage, removeEditor } from "./editor-actions";
import { InvitePanel } from "./invite-panel";

const personName = (p: { name: string | null; email: string | null }) => p.name ?? p.email ?? "Someone";
const shortDate = (d: Date) => d.toLocaleDateString("en", { month: "short", day: "numeric" });

export default async function LanguagePage({ params }: PageProps<"/languages/[id]">) {
  const { id } = await params;
  const userId = await currentUserId();
  if (!userId) redirect(`/signin?callbackUrl=/languages/${id}`);

  const language = await db.language.findFirst({
    where: { id, ...editableBy(userId) },
    include: {
      _count: { select: { phonemes: true, words: true, grammarPages: true, paradigms: true, soundChanges: true } },
      daughters: { where: editableBy(userId), orderBy: { createdAt: "asc" }, select: { id: true, name: true } },
      owner: { select: { name: true, email: true } },
      editors: {
        orderBy: { createdAt: "asc" },
        select: { userId: true, user: { select: { name: true, email: true } } },
      },
      invites: {
        where: { expiresAt: { gt: new Date() } },
        orderBy: { createdAt: "asc" },
        select: { id: true, createdAt: true, expiresAt: true },
      },
    },
  });
  if (!language) notFound();
  const isOwner = language.ownerId === userId;
  // Only show the parent when this person can open it too.
  const parent = language.parentId
    ? await db.language.findFirst({
        where: { id: language.parentId, ...editableBy(userId) },
        select: { id: true, name: true },
      })
    : null;

  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-semibold">
          {language.name}
          {language.autonym && (
            <span className="ml-3 text-xl font-normal opacity-70">{language.autonym}</span>
          )}
        </h1>
        {language.description && <p className="max-w-prose opacity-80">{language.description}</p>}
        {(parent || language.daughters.length > 0) && (
          <p className="text-sm opacity-80">
            {parent && (
              <span className="mr-4">
                Descended from{" "}
                <Link href={`/languages/${parent.id}`} className="underline">
                  {parent.name}
                </Link>
              </span>
            )}
            {language.daughters.length > 0 && (
              <span>
                Daughter language{language.daughters.length === 1 ? "" : "s"}:{" "}
                {language.daughters.map((d, i) => (
                  <span key={d.id}>
                    {i > 0 && ", "}
                    <Link href={`/languages/${d.id}`} className="underline">
                      {d.name}
                    </Link>
                  </span>
                ))}
              </span>
            )}
          </p>
        )}
      </header>

      <div className="grid gap-4 sm:grid-cols-2">
        <Link
          href={`/languages/${language.id}/phonology`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Phonology</h2>
          <p className="text-sm opacity-70">
            {language._count.phonemes === 0
              ? "Choose your sounds and how they are spelled."
              : `${language._count.phonemes} sound${language._count.phonemes === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/lexicon`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Lexicon</h2>
          <p className="text-sm opacity-70">
            {language._count.words === 0
              ? "Start your dictionary."
              : `${language._count.words} word${language._count.words === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/generator`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Word generator</h2>
          <p className="text-sm opacity-70">Generate words that fit your phonology.</p>
        </Link>
        <Link
          href={`/languages/${language.id}/grammar`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Grammar</h2>
          <p className="text-sm opacity-70">
            {language._count.grammarPages === 0
              ? "Document your grammar with glossed examples."
              : `${language._count.grammarPages} page${language._count.grammarPages === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/inflection`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Inflection</h2>
          <p className="text-sm opacity-70">
            {language._count.paradigms === 0
              ? "Set up tables of word forms, like case and number."
              : `${language._count.paradigms} table${language._count.paradigms === 1 ? "" : "s"}`}
          </p>
        </Link>
        <Link
          href={`/languages/${language.id}/sound-changes`}
          className="rounded-lg border border-black/10 p-4 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/5"
        >
          <h2 className="font-semibold">Sound changes</h2>
          <p className="text-sm opacity-70">
            {language._count.soundChanges === 0
              ? "Evolve your words with rules like p > f / V_V."
              : `${language._count.soundChanges} rule set${language._count.soundChanges === 1 ? "" : "s"}`}
          </p>
        </Link>
      </div>

      {isOwner ? (
        <>
          <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h2 className="font-semibold">Sharing</h2>
            {language.visibility === "PRIVATE" ? (
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <p className="opacity-80">
                  {language.editors.length === 0
                    ? "Only you can see this language."
                    : "Only you and the editors below can see this language."}
                </p>
                <form action={setVisibility.bind(null, language.id, "UNLISTED")}>
                  <button type="submit" className="rounded-md bg-foreground px-3 py-1.5 text-background">
                    Share with a link
                  </button>
                </form>
                <Link href={`/share/${language.id}`} className="underline opacity-70">
                  Preview
                </Link>
              </div>
            ) : (
              <div className="space-y-2 text-sm">
                <p className="opacity-80">
                  Anyone with the link can read this language&apos;s sounds, dictionary and grammar, but only you
                  {language.editors.length > 0 && " and the editors below"} can change them.
                </p>
                <div className="flex flex-wrap items-center gap-3">
                  <Link href={`/share/${language.id}`} className="font-mono underline">
                    /share/{language.id}
                  </Link>
                  <CopyLinkButton path={`/share/${language.id}`} />
                  <form action={setVisibility.bind(null, language.id, "PRIVATE")}>
                    <button type="submit" className="underline opacity-70 hover:opacity-100">
                      Make private
                    </button>
                  </form>
                </div>
              </div>
            )}
          </section>

          <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
            <h2 className="font-semibold">Editors</h2>
            <p className="max-w-prose text-sm opacity-80">
              {language.editors.length === 0
                ? "Only you can edit this language. To work on it with someone, send them an invite link."
                : "These people can change everything in this language. Only you can delete it or change who sees or edits it."}
            </p>
            {language.editors.length > 0 && (
              <ul className="divide-y divide-black/5 text-sm dark:divide-white/10">
                {language.editors.map((e) => (
                  <li key={e.userId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <span>
                      {personName(e.user)}
                      {e.user.name && e.user.email && <span className="ml-2 opacity-60">{e.user.email}</span>}
                    </span>
                    <form action={removeEditor.bind(null, language.id, e.userId)}>
                      <button type="submit" className="underline opacity-70 hover:opacity-100">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            <InvitePanel action={createInvite.bind(null, language.id)} days={INVITE_DAYS} />
            {language.invites.length > 0 && (
              <div className="space-y-1 text-sm">
                <p className="opacity-70">
                  Unused invite link{language.invites.length === 1 ? "" : "s"}:
                </p>
                <ul className="space-y-1">
                  {language.invites.map((invite) => (
                    <li key={invite.id} className="flex flex-wrap items-center gap-3">
                      <span>
                        Made {shortDate(invite.createdAt)}, works until {shortDate(invite.expiresAt)}
                      </span>
                      <form action={cancelInvite.bind(null, language.id, invite.id)}>
                        <button type="submit" className="underline opacity-70 hover:opacity-100">
                          Cancel
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>

          <form action={deleteLanguage.bind(null, language.id)}>
            <button type="submit" className="text-sm text-red-600 underline">
              Delete this language
            </button>
          </form>
        </>
      ) : (
        <section className="space-y-3 rounded-lg border border-black/10 p-4 dark:border-white/15">
          <h2 className="font-semibold">You&apos;re an editor</h2>
          <p className="max-w-prose text-sm opacity-80">
            {personName(language.owner)} owns this language and invited you to edit it. Only they can delete it or
            change who sees or edits it.
          </p>
          <form action={leaveLanguage.bind(null, language.id)}>
            <button type="submit" className="text-sm underline opacity-70 hover:opacity-100">
              Leave this language
            </button>
          </form>
        </section>
      )}
    </div>
  );
}
