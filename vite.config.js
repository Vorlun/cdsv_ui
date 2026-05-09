import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  plugins: [react()],

  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
      "/upload": {
        target: "http://127.0.0.1:3001",
        changeOrigin: true,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(dirname, "./src"),
    },
  },

  build: {
    target: "es2020",
    minify: "esbuild",
    sourcemap: false,
    chunkSizeWarningLimit: 800,
    rollupOptions: {
      output: {
        manualChunks: {
          // React runtime
          "vendor-react": ["react", "react-dom"],
          // Routing
          "vendor-router": ["react-router-dom"],
          // Animation
          "vendor-motion": ["motion/react"],
          // Charting
          "vendor-charts": ["recharts"],
          // Icons (largest bundle — split out)
          "vendor-icons": ["lucide-react"],
          // Auth context + services
          "chunk-auth": [
            "./src/features/auth/context/AuthContext.jsx",
            "./src/services/api.js",
          ],
        },
      },
    },
  },
});
