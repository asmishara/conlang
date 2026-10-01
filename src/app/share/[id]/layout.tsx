import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { sharedLanguage } from "@/lib/sharing";
import { SharedNav } from "./shared-nav";

export async function generateMetadata({ params }: LayoutProps<"/share/[id]">): Promise<Metadata> {
  const language = await sharedLanguage((await params).id);
  if (!language) return {};
  return {
    title: `${language.name} · Conlang Workshop`,
    description: language.description ?? `${language.name}, a constructed language.`,
    // Shared by link only, so keep it out of search results.
    robots: { index: false, follow: false },
  };
}

export default async function SharedLanguageLayout({ children, params }: LayoutProps<"/share/[id]">) {
  const { id } = await params;
  const language = await sharedLanguage(id);
  if (!language) notFound();

  return (
    <div className="space-y-6">
      {language.isOwner && (
        <p className="rounded-md bg-sky-50 px-3 py-2 text-sm text-sky-900 dark:bg-sky-950 dark:text-sky-100">
          {language.visibility === "PRIVATE"
            ? "Only you can see this preview, because this language is private."
            : "This is what people with the link see."}{" "}
          <Link href={`/languages/${language.id}`} className="font-medium underline">
            Back to editing
          </Link>
        </p>
      )}
      <header className="space-y-3 border-b border-black/10 pb-3 dark:border-white/15">
        <h1 className="text-3xl font-semibold">
          {language.name}
          {language.autonym && <span className="ml-3 font-ipa text-xl font-normal opacity-70">{language.autonym}</span>}
        </h1>
        <SharedNav base={`/share/${language.id}`} />
      </header>
      {children}
    </div>
  );
}
