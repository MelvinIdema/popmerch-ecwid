import { defineConfig } from "vite";
import { resolve } from "path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/main.js"),
      name: "CustomPopmerch",
      formats: ["iife"],
      fileName: (format) => `custom-popmerch.js`,
    },
    outDir: ".", // Build to root to replace the existing file
    emptyOutDir: false,
    minify: false, // Keep it readable for now as per "simple" request, or standard minify.
  },
});
