import { postSocUpload } from "@/services/api";
import { digestSha256HexFromBlob } from "@/features/soc-upload/useClientSha256";

/**
 * @param {File} file
 * @param {{
 *   signal?: AbortSignal;
 *   onProgress?: (percent: number) => void;
 * }} options
 */
export async function uploadSingleFile(file, { signal, onProgress } = {}) {
  if (onProgress) onProgress(25);
  const hash = await digestSha256HexFromBlob(file);
  if (onProgress) onProgress(65);
  const body = new FormData();
  body.append("file", file);
  body.append("clientSha256", hash);
  const data = await postSocUpload(body, { signal });
  if (onProgress) onProgress(100);
  return data;
}
