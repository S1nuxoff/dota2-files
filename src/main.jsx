import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { followLinks, fromHash } from "./lib/route.js";
import "./index.css";

fromHash();
followLinks();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);
