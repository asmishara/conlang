import { z } from "zod";

const phoneme = z.object({
  ipa: z.string().trim().normalize("NFC").min(1).max(16),
  kind: z.enum(["CONSONANT", "VOWEL"]),
  spelling: z.string().trim().normalize("NFC").max(16),
});

/** The full inventory as saved from the editor, in display order. */
export const inventoryInput = z
  .array(phoneme)
  .max(300, "An inventory can have at most 300 sounds")
  .transform((list) => list.map((p) => ({ ...p, spelling: p.spelling || p.ipa })))
  .superRefine((list, ctx) => {
    const seen = new Set<string>();
    for (const p of list) {
      if (seen.has(p.ipa)) ctx.addIssue({ code: "custom", message: `/${p.ipa}/ is listed twice` });
      seen.add(p.ipa);
    }
  });

export type InventoryInput = z.infer<typeof inventoryInput>;
