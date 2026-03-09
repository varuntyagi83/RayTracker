/**
 * Token Encryption Utility (M-27 fix)
 *
 * Encrypts OAuth tokens (Meta access token, Slack bot token, Slack webhook URL)
 * at rest using AES-256-GCM before storing them in the database.
 *
 * Encrypted format: "enc:v1:<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 * Unencrypted stored values (legacy / no TOKEN_ENCRYPTION_KEY configured)
 * are returned as-is by decryptToken() for backward compatibility.
 *
 * Requires env var: TOKEN_ENCRYPTION_KEY (32-byte hex string, 64 hex chars)
 * Generate with: node -e "require('crypto').randomBytes(32).toString('hex') |> console.log"
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_BYTES = 16;
const TAG_BYTES = 16;
const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const hex = process.env.TOKEN_ENCRYPTION_KEY;
  if (!hex) return null;
  const buf = Buffer.from(hex, "hex");
  if (buf.byteLength !== 32) {
    console.error(
      "[token-crypto] TOKEN_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars)"
    );
    return null;
  }
  return buf;
}

/**
 * Encrypt a plaintext token string.
 * Returns the original value if TOKEN_ENCRYPTION_KEY is not configured.
 */
export function encryptToken(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext; // No-op in local dev / key not set

  const iv = crypto.randomBytes(IV_BYTES);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv) as crypto.CipherGCM;
  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return `${PREFIX}${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
}

/**
 * Decrypt a token that was encrypted with encryptToken().
 * If the value does not have the encrypted prefix (legacy plaintext),
 * returns it as-is for backward compatibility.
 * Returns null if decryption fails.
 */
export function decryptToken(stored: string | null | undefined): string | null {
  if (!stored) return null;
  if (!stored.startsWith(PREFIX)) return stored; // Legacy plaintext — return as-is

  const key = getKey();
  if (!key) {
    console.error("[token-crypto] Encrypted token found but TOKEN_ENCRYPTION_KEY is not set");
    return null;
  }

  try {
    const rest = stored.slice(PREFIX.length); // "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
    const parts = rest.split(":");
    if (parts.length !== 3) return null;

    const [ivHex, tagHex, ctHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const ciphertext = Buffer.from(ctHex, "hex");

    if (iv.byteLength !== IV_BYTES || authTag.byteLength !== TAG_BYTES) return null;

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv) as crypto.DecipherGCM;
    decipher.setAuthTag(authTag);
    const decrypted = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
    return decrypted.toString("utf8");
  } catch {
    console.error("[token-crypto] Failed to decrypt token — key mismatch or corrupted data");
    return null;
  }
}
