import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { NewLanguageForm } from "./new-language-form";

export default async function LanguagesPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/signin?callbackUrl=/languages");

  const languages = await db.language.findMany({
    where: editableBy(userId),
    orderBy: { updatedAt: "desc" },
    include: {
      owner: { select: { name: true, email: true } },
      parent: { select: { name: true, ownerId: true, editors: { where: { userId }, select: { userId: true } } } },
    },
  });
  const mine = languages.filter((l) => l.ownerId === userId);
  const shared = languages.filter((l) => l.ownerId !== userId);

  const item = (lang: (typeof languages)[number]) => (
    <li key={lang.id} className="py-3">
      <Link href={`/languages/${lang.id}`} className="font-medium underline">
        {lang.name}
      </Link>
      {lang.autonym && <span className="ml-2 opacity-70">({lang.autonym})</span>}
      {lang.parent && (lang.parent.ownerId === userId || lang.parent.editors.length > 0) && (
        <span className="ml-2 text-sm opacity-60">from {lang.parent.name}</span>
      )}
      {lang.ownerId !== userId && (
        <span className="ml-2 text-sm opacity-60">by {lang.owner.name ?? lang.owner.email ?? "someone"}</span>
      )}
    </li>
  );

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">My languages</h1>
        {mine.length === 0 ? (
          <p className="opacity-70">No languages yet. Create your first one below.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/15">{mine.map(item)}</ul>
        )}
      </section>
      {shared.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-xl font-semibold">Languages you help edit</h2>
          <ul className="divide-y divide-black/10 dark:divide-white/15">{shared.map(item)}</ul>
        </section>
      )}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">New language</h2>
        <NewLanguageForm />
      </section>
    </div>
  );
}
