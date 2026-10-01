import { describe, expect, it } from "vitest";
import { canView } from "./visibility";

describe("canView", () => {
  it("lets anyone read shared languages and only the owner read private ones", () => {
    expect(canView("UNLISTED", "owner", null)).toBe(true);
    expect(canView("PUBLIC", "owner", "someone")).toBe(true);
    expect(canView("PRIVATE", "owner", "owner")).toBe(true);
    expect(canView("PRIVATE", "owner", "someone")).toBe(false);
    expect(canView("PRIVATE", "owner", null)).toBe(false);
  });
});
