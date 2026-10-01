import { currentUserId } from "@/auth";
import { editableBy } from "@/lib/access";
import { db } from "@/lib/db";
import { prepareWords } from "@/lib/lexicon";
import { lexiconToCsv } from "@/lib/lexicon-csv";

export async function GET(_req: Request, ctx: RouteContext<"/languages/[id]/lexicon/export">) {
  const { id } = await ctx.params;
  const userId = await currentUserId();
  if (!userId) return new Response("Sign in to export.", { status: 401 });

  const language = await db.language.findFirst({
    where: { id, ...editableBy(userId) },
    select: {
      name: true,
      phonemes: { orderBy: { position: "asc" }, select: { ipa: true, spelling: true } },
      words: true,
    },
  });
  if (!language) return new Response("Not found.", { status: 404 });

  const words = prepareWords(language.words, language.phonemes).map((w) => ({
    ...w,
    // Export the stored override, or the derived form so the file is complete.
    pronunciation: w.ipa ?? "",
  }));
  const filename = `${language.name.replace(/[^\p{L}\p{N}_-]+/gu, "-") || "lexicon"}-lexicon.csv`;

  return new Response(lexiconToCsv(words), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="lexicon.csv"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
