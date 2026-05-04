import { useCallback, useState } from "react";

/**
 * Diplomarbeit / coursework note — Web Cryptography Subtle.digest gives a client-side fingerprint
 * *before* the object reaches the ingestion tier (early tamper awareness for analysts).
 */

/**
 * @param {ArrayBuffer | ArrayBufferView} buffer
 */
/**
 * Hash raw bytes from an ArrayBuffer (from `blob.arrayBuffer()`).
 * @param {ArrayBuffer} ab
 */
export async function digestSha256HexFromArrayBuffer(ab) {
  const hash = await crypto.subtle.digest("SHA-256", ab);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** @param {Blob | File} blob */
export async function digestSha256HexFromBlob(blob) {
  const ab = await blob.arrayBuffer();
  return digestSha256HexFromArrayBuffer(ab);
}

export function useClientSha256() {
  const [hashHex, setHashHex] = useState("");
  const [hashing, setHashing] = useState(false);
  const [hashError, setHashError] = useState("");

  const computeForFile = useCallback(async (file) => {
    if (!file) {
      setHashHex("");
      setHashError("");
      return;
    }
    setHashing(true);
    setHashError("");
    try {
      const hex = await digestSha256HexFromBlob(file);
      setHashHex(hex);
    } catch {
      setHashHex("");
      setHashError("Could not compute SHA-256 in this browser context.");
    } finally {
      setHashing(false);
    }
  }, []);

  return { hashHex, hashing, hashError, computeForFile, setHashHex, setHashError };
}
