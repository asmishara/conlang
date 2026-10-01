import { db } from "@/lib/db";
import { soundClasses } from "@/lib/inflection";
import { phonotacticsOf } from "@/lib/phonotactics";

/** The phonemes and generator categories that sound classes in rules are built from. */
export async function languageClassSource(languageId: string) {
  const language = await db.language.findUnique({
    where: { id: languageId },
    select: {
      phonemes: { orderBy: { position: "asc" }, select: { ipa: true, kind: true, spelling: true } },
      generator: { select: { categories: true, patterns: true, forbidden: true } },
    },
  });
  return {
    phonemes: language?.phonemes ?? [],
    categories: phonotacticsOf(language?.generator ?? null)?.categories ?? [],
  };
}

export async function languageClasses(languageId: string) {
  const { phonemes, categories } = await languageClassSource(languageId);
  return soundClasses(phonemes, categories);
}
