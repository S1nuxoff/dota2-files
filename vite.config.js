import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// Where the site is served from: the GitHub Pages project page; "/" on a domain of its own (BASE_PATH)
export default defineConfig({
  base: process.env.BASE_PATH || "/dota2-files/",
  plugins: [react(), tailwindcss()],
  // the search by look's worker loads the CLIP library on demand: a module worker can split it off
  worker: { format: "es" },
});
