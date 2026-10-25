import { useEffect, useState } from "react";
import { DOTADEX } from "../datasets.js";

// How heroes and items are shown: "simple", this site's own quick viewer (the default), or "game",
// as Dotadex draws them (the game's shader, lights, particles) in its embed frame. Remembered per browser
const KEY = "look";
const read = () => {
  try {
    return localStorage.getItem(KEY) === "game" ? "game" : "simple";
  } catch {
    return "simple";
  }
};
const listeners = new Set();

export function useLook() {
  const [look, setLookState] = useState(read);
  useEffect(() => {
    listeners.add(setLookState);
    return () => listeners.delete(setLookState);
  }, []);
  const setLook = (next) => {
    try {
      localStorage.setItem(KEY, next);
    } catch {}
    listeners.forEach((l) => l(next));
  };
  return [look, setLook];
}

export function LookSwitch({ look, setLook, className = "" }) {
  return (
    <div className={`flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md ${className}`} role="group" aria-label="How it is shown">
      {[
        ["game", "Game look"],
        ["simple", "Simple"],
      ].map(([id, title]) => (
        <button
          key={id}
          onClick={() => setLook(id)}
          title={id === "game" ? "As the game shows it, with its effects (Dotadex)" : "This site's quick viewer"}
          className={`h-8 rounded-full px-3.5 text-[0.82rem] transition-colors ${look === id ? "bg-ink-100 text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
        >
          {title}
        </button>
      ))}
    </div>
  );
}

// Dotadex's embed of a hero or an item (path: hero/<key>?persona=<n>, item/<id>), started at once,
// without its own link to Dotadex (the page has one) and without a background of its own (bg=0): the
// model stands on this page's light, as the simple view does
export default function GameStage({ path, title }) {
  const [page, query] = path.split("?");
  const params = new URLSearchParams(query || "");
  params.set("autoplay", "1");
  params.set("link", "0");
  params.set("bg", "0");
  return <iframe key={path} src={`${DOTADEX}/embed/${page}?${params}`} title={`${title} in 3D`} allow="fullscreen" className="absolute inset-0 h-full w-full border-0 bg-transparent [color-scheme:dark]" />;
}
