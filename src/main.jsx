import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { followLinks, fromHash } from "./lib/route.js";
import "./index.css";

fromHash();
followLinks();

// Pictures come in whole: hidden while they load (no strips drawn as the data arrives), then eased in
// (index.css, img.is-loaded); a picture that fails is let through too, for its fallback
const loaded = (e) => e.target.tagName === "IMG" && e.target.classList.add("is-loaded");
document.addEventListener("load", loaded, true);
document.addEventListener("error", loaded, true);

// A tab left open over a new deploy asks for parts of the site that are gone (their names change
// with each build): it loads the page again, once, to get the new ones
window.addEventListener("vite:preloadError", (event) => {
  const key = "reloaded-for-deploy";
  try {
    if (sessionStorage.getItem(key) === location.href) return;
    sessionStorage.setItem(key, location.href);
  } catch {
    return;
  }
  event.preventDefault();
  location.reload();
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
