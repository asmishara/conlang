import Link from "next/link";
import { redirect } from "next/navigation";
import { currentUserId } from "@/auth";
import { db } from "@/lib/db";
import { NewLanguageForm } from "./new-language-form";

export default async function LanguagesPage() {
  const userId = await currentUserId();
  if (!userId) redirect("/signin?callbackUrl=/languages");

  const languages = await db.language.findMany({
    where: { ownerId: userId },
    orderBy: { updatedAt: "desc" },
    include: { parent: { select: { name: true, ownerId: true } } },
  });

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <h1 className="text-2xl font-semibold">My languages</h1>
        {languages.length === 0 ? (
          <p className="opacity-70">No languages yet. Create your first one below.</p>
        ) : (
          <ul className="divide-y divide-black/10 dark:divide-white/15">
            {languages.map((lang) => (
              <li key={lang.id} className="py-3">
                <Link href={`/languages/${lang.id}`} className="font-medium underline">
                  {lang.name}
                </Link>
                {lang.autonym && <span className="ml-2 opacity-70">({lang.autonym})</span>}
                {lang.parent?.ownerId === userId && (
                  <span className="ml-2 text-sm opacity-60">from {lang.parent.name}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className="space-y-4">
        <h2 className="text-xl font-semibold">New language</h2>
        <NewLanguageForm />
      </section>
    </div>
  );
}
