import { createHash, randomBytes } from "node:crypto";

/** How long an invite link works for. */
export const INVITE_DAYS = 7;
/** At most this many unused invite links per language. */
export const MAX_PENDING_INVITES = 20;

/** A new invite token for a link, and the hash that is stored instead of it. */
export function newInviteToken(): { token: string; tokenHash: string } {
  const token = randomBytes(24).toString("base64url");
  return { token, tokenHash: hashInviteToken(token) };
}

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
