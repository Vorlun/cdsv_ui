/**
 * Streams a file through SHA-256 (memory-efficient for multi-MB payloads).
 * @param {string} filePath Absolute path to plaintext file on disk.
 * @returns {Promise<string>} Hex digest (lowercase).
 */
import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";

export function sha256HexFile(filePath) {
  return new Promise((resolve, reject) => {
    const hash = createHash("sha256");
    const rs = createReadStream(filePath);
    rs.on("error", reject);
    rs.on("data", (chunk) => hash.update(chunk));
    rs.on("end", () => resolve(hash.digest("hex")));
  });
}
