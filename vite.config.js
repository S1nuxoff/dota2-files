import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Relative base: the site works from any folder (GitHub Pages project page or a custom domain);
// pages are addressed by the hash, so there is no server routing to set up
export default defineConfig({
  base: "./",
  plugins: [react(), tailwindcss()],
});
