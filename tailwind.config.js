/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  // dark: mode is toggled by [data-theme="dark"] on <html>
  darkMode: ["selector", "[data-theme='dark']"],
  theme: {
    extend: {
      colors: {
        // Semantic tokens backed by CSS variables — usable in JSX as bg-surface, text-primary, etc.
        "bg-primary":    "var(--bg-primary)",
        "bg-secondary":  "var(--bg-secondary)",
        surface:         "var(--surface)",
        "surface-hover": "var(--surface-hover)",
        border:          "var(--border)",
        "border-strong": "var(--border-strong)",
        "text-primary":  "var(--text-primary)",
        "text-secondary":"var(--text-secondary)",
        "text-muted":    "var(--text-muted)",
        "accent":        "var(--accent)",
      },
      boxShadow: {
        "card": "var(--card-shadow)",
        "ring": "0 0 0 3px var(--ring)",
      },
    },
  },
  plugins: [],
};
