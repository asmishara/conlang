import type { Visibility } from "@/generated/prisma/client";

/** Anyone can read a language that isn't private; its owner can always preview it. */
export function canView(visibility: Visibility, ownerId: string, viewerId: string | null): boolean {
  return visibility !== "PRIVATE" || ownerId === viewerId;
}

/** The sharing choices offered for now. PUBLIC is kept for a future gallery of listed languages. */
export const sharingChoices = ["PRIVATE", "UNLISTED"] as const satisfies readonly Visibility[];
