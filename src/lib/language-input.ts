import { z } from "zod";

export const languageInput = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  autonym: z
    .string()
    .trim()
    .max(100)
    .transform((s) => s || null),
  description: z
    .string()
    .trim()
    .max(5000)
    .transform((s) => s || null),
  visibility: z.enum(["PRIVATE", "UNLISTED", "PUBLIC"]).default("PRIVATE"),
});

export type LanguageInput = z.infer<typeof languageInput>;

/** Parses a create/edit language form into validated fields. */
export function parseLanguageForm(formData: FormData) {
  return languageInput.safeParse({
    name: formData.get("name") ?? "",
    autonym: formData.get("autonym") ?? "",
    description: formData.get("description") ?? "",
    visibility: formData.get("visibility") || undefined,
  });
}
