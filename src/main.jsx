import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { followLinks, fromHash } from "./lib/route.js";
import "./index.css";

fromHash();
followLinks();

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
