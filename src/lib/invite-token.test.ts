import { describe, expect, it } from "vitest";
import { hashInviteToken, newInviteToken } from "./invite-token";

describe("invite tokens", () => {
  it("makes unguessable, URL-safe tokens and stores only their hash", () => {
    const a = newInviteToken();
    const b = newInviteToken();
    expect(a.token).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashInviteToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
    expect(a.tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });
});
