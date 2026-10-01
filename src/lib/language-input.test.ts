import { describe, expect, it } from "vitest";
import { parseLanguageForm } from "./language-input";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.set(k, v);
  return fd;
}

describe("parseLanguageForm", () => {
  it("trims fields and turns blanks into null", () => {
    const result = parseLanguageForm(
      form({ name: "  Toki Pona ", autonym: " ", description: "" }),
    );
    expect(result.success).toBe(true);
    expect(result.data).toEqual({
      name: "Toki Pona",
      autonym: null,
      description: null,
      visibility: "PRIVATE",
    });
  });

  it("requires a name", () => {
    const result = parseLanguageForm(form({ name: "   " }));
    expect(result.success).toBe(false);
  });

  it("rejects unknown visibility values", () => {
    const result = parseLanguageForm(form({ name: "Quenya", visibility: "SECRET" }));
    expect(result.success).toBe(false);
  });

  it("accepts an explicit visibility", () => {
    const result = parseLanguageForm(form({ name: "Quenya", visibility: "PUBLIC" }));
    expect(result.data?.visibility).toBe("PUBLIC");
  });
});
