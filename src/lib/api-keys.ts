import { createHash, randomBytes } from "node:crypto";

// API keys look like "bf_live_<random>". Only the SHA-256 hash is stored, so a
// leaked database never reveals working keys.

export const API_KEY_PATTERN = /^bf_[a-z]+_[A-Za-z0-9_-]{16,}$/;

export function hashApiKey(key: string) {
  return createHash("sha256").update(key).digest("hex");
}

/** The first characters, kept so people can tell their keys apart. */
export function apiKeyPrefix(key: string) {
  return key.slice(0, 12);
}

export function generateApiKey() {
  return `bf_live_${randomBytes(24).toString("base64url")}`;
}
