const HTML_ESCAPE = new Map([
  ["&", "&amp;"],
  ["<", "&lt;"],
  [">", "&gt;"],
  ['"', "&quot;"],
  ["'", "&#39;"],
]);

/**
 * Encode text for insertion into HTML (mitigates naive XSS when using innerHTML dangerously).
 */
export function escapeHtml(value) {
  if (value == null) return "";
  return String(value).replace(/[&<>"']/g, (ch) => HTML_ESCAPE.get(ch) ?? ch);
}

/** Remove control chars and truncate for plain-text fields shown in tables. */
export function sanitizePlainText(input, maxLen = 4096) {
  if (input == null) return "";
  const s = String(input).slice(0, maxLen);
  const noControls = [...s]
    .filter((ch) => {
      const c = ch.charCodeAt(0);
      return c >= 32 && c !== 127;
    })
    .join("");
  return noControls.replace(/[<>'"]/g, "");
}
