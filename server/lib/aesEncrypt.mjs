/**
 * AES-256-GCM authenticated encryption — provides confidentiality AND integrity (AEAD).
 * Encrypted blob format: nonce(12 B) || ciphertext || authTag(16 B).
 *
 * Diploma note: GCM derives an authentication tag — tampering is detected at decrypt time.
 */
import crypto from "node:crypto";

const ALGORITHM = "aes-256-gcm";

/**
 * Derive a 32-byte AES key from SCUP_AES_MASTER env (recommended ≥16 chars),
 * otherwise use a warned demo derivation (never ship as-is — prefer AWS KMS/HSM Vault).
 */
function loadKeyBytes() {
  const secret =
    typeof process.env.SCUP_AES_MASTER === "string" && process.env.SCUP_AES_MASTER.length >= 16
      ? process.env.SCUP_AES_MASTER
      : null;
  if (!secret) {
    console.warn(
      "[SOC-API] SCUP_AES_MASTER not set — using demo scrypt derivation. Set SCUP_AES_MASTER for reproducible SOC labs.",
    );
    return crypto.scryptSync(
      "CHANGE-ME-demo-soc-demo-only-not-production",
      "soc-upload-pepper-v1-demo",
      32,
    );
  }
  return crypto.scryptSync(secret, "soc-upload-pepper-v1", 32);
}

const KEY_MATERIAL = loadKeyBytes();

/**
 * Encrypt a buffer using AES-256-GCM with a random nonce (IV).
 * @param {Buffer} plaintext Raw file contents.
 */
export function encryptBufferAes256Gcm(plaintext) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY_MATERIAL, iv, { authTagLength: 16 });
  const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
  const authTag = cipher.getAuthTag();
  const blob = Buffer.concat([iv, ciphertext, authTag]);

  return {
    blob,
    ivBase64: iv.toString("base64"),
    algorithm: "AES-256-GCM",
  };
}
