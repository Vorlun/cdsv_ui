import axios from "axios";

/**
 * @param {File} file
 * @param {{
 *   signal?: AbortSignal;
 *   onProgress?: (percent: number) => void;
 * }} options
 */
export async function uploadSingleFile(file, { signal, onProgress } = {}) {
  const body = new FormData();
  body.append("file", file);

  const { data } = await axios.post("/api/upload", body, {
    signal,
    headers: { "Content-Type": "multipart/form-data" },
    maxBodyLength: Infinity,
    maxContentLength: Infinity,
    onUploadProgress: (ev) => {
      if (!onProgress) return;
      const total = ev.total;
      let pct;
      if (total != null && total > 0) {
        pct = Math.round((100 * ev.loaded) / total);
      } else {
        pct = Math.min(92, Math.round((ev.loaded * 100) / Math.max(file.size, 1)));
      }
      onProgress(Math.min(99, Math.max(0, pct)));
    },
  });

  if (onProgress) onProgress(100);
  return data;
}
