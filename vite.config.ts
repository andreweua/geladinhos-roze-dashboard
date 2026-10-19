import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: './' ensures assets resolve properly on GitHub Pages regardless of repository name
export default defineConfig({
  base: "./",
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
