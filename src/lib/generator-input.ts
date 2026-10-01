import { z } from "zod";
import { validateSettings } from "./generator";

const symbol = z.string().trim().normalize("NFC").min(1).max(16);

export const generatorInput = z
  .object({
    categories: z
      .array(
        z.object({
          label: z.string().trim().length(1),
          members: z.array(symbol).max(200),
        }),
      )
      .max(26),
    patterns: z.array(z.string().trim().min(1).max(60)).max(30),
    minSyllables: z.number().int().min(1).max(10),
    maxSyllables: z.number().int().min(1).max(10),
    dropoff: z.boolean(),
    forbidden: z.array(symbol).max(100),
  })
  .superRefine((s, ctx) => {
    for (const message of validateSettings(s)) ctx.addIssue({ code: "custom", message });
  });

/** Splits "p t  k" or "p, t, k" into ["p", "t", "k"]. */
export function splitSymbols(raw: string): string[] {
  return raw
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}
