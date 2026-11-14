import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { existsSync, readFileSync } from "node:fs";

// Files that sit next to index.html and are copied into the build as they are
// (service worker, install manifest and icons), so the project needs no sub-folders.
const staticFiles = ["sw.js", "manifest.webmanifest", "icon-192.png", "icon-512.png"];

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
  server: {
    host: "0.0.0.0",
    port: 3000,
  },
});
