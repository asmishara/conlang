import { cache } from "react";
import { currentUserId } from "@/auth";
import { db } from "./db";
import { canView } from "./visibility";

/**
 * The language behind a shared link, or null when this viewer can't see it.
 * Cached per request, so a layout and its page share one lookup.
 */
export const sharedLanguage = cache(async (id: string) => {
  const language = await db.language.findUnique({
    where: { id },
    select: { id: true, name: true, autonym: true, description: true, visibility: true, ownerId: true },
  });
  if (!language) return null;
  const viewerId = await currentUserId();
  if (!canView(language.visibility, language.ownerId, viewerId)) return null;
  return { ...language, isOwner: language.ownerId === viewerId };
});
