import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readFileSync } from "node:fs";

// Files that sit next to index.html and are copied into the build as they are
// (service worker, install manifest and icons), so the project needs no sub-folders.
const staticFiles = ["sw.js", "manifest.webmanifest", "icon-192.png", "icon-512.png", "badge-96.png"];

function copyStaticFiles() {
  return {
    name: "copy-static-files",
    generateBundle() {
      for (const fileName of staticFiles) {
        if (existsSync(fileName)) {
          this.emitFile({ type: "asset", fileName, source: readFileSync(fileName) });
        }
      }
    },
  };
}

// BASE_PATH is set by the GitHub Pages workflow (e.g. "/repo-name/").
// Locally it falls back to "/".
export default defineConfig({
  base: process.env.BASE_PATH || "/",
  publicDir: false,
  plugins: [react(), tailwindcss(), copyStaticFiles()],
  build: {
    target: "es2020", // modern phones: smaller, faster code (no old-browser fallbacks)
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Libraries live in their own files: they rarely change, so the phone keeps them cached between updates,
        // and the browser downloads/parses them in parallel with the app code.
        manualChunks(id) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("framer-motion") || id.includes("motion-dom") || id.includes("motion-utils")) return "motion";
          if (id.includes("@supabase") || id.includes("isows") || id.includes("ws/")) return "supabase";
          if (id.includes("lucide-react")) return "icons";
          if (/node_modules[\/\\](react|react-dom|scheduler)[\/\\]/.test(id)) return "react";
          return undefined;
        },
      },
    },
  },
  esbuild: { legalComments: "none" },
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
