import { defineConfig } from "vite";
import { resolve } from "path";
import { writeFileSync, readdirSync } from "fs";

// After the build, finds the hashed runtime bundle and writes dist/manifest.json.
function generateManifestPlugin() {
  return {
    name: "generate-manifest",
    closeBundle() {
      const files = readdirSync("dist");
      const runtimeFile = files.find((f) => /^runtime\.[A-Za-z0-9_-]+\.js$/.test(f));
      if (!runtimeFile) {
        throw new Error(
          "[Popmerch] Build error: could not find runtime.[hash].js in dist/"
        );
      }
      writeFileSync(
        "dist/manifest.json",
        JSON.stringify({ runtimeUrl: runtimeFile }, null, 2) + "\n"
      );
      console.log(`[Popmerch] Generated dist/manifest.json → ${runtimeFile}`);
    },
  };
}

export default defineConfig({
  plugins: [generateManifestPlugin()],
  build: {
    // Use rollupOptions directly (not lib mode) so entryFileNames with [hash]
    // is not overridden by Vite's lib mode defaults.
    rollupOptions: {
      input: { runtime: resolve(__dirname, "src/main.js") },
      output: {
        format: "iife",
        name: "CustomPopmerch",
        // [name] = "runtime" (from the input key), [hash] = content hash.
        entryFileNames: "runtime.[hash].js",
      },
    },
    outDir: "dist",
    emptyOutDir: true,
    minify: false,
  },
});
