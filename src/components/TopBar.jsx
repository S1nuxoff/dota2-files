import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { link, navigate } from "../lib/route.js";
import { datasetById } from "../datasets.js";

const SECTIONS = [
  ["/", "Heroes", (r) => !r.ds || r.ds === "hero"],
  ["/3d", "3D models", (r) => r.ds === "3d"],
  ["/cosmetics", "Cosmetics", (r) => r.ds === "cosmetics" || r.ds === "item"],
  ["/files", "Files", (r) => r.ds === "files" || !!datasetById(r.ds) || r.ds === "all"],
];

// The site's one bar: a glass capsule floating over the page, with the sections and the search
export default function TopBar({ route }) {
  const [text, setText] = useState(route.q);
  const input = useRef(null);
  useEffect(() => {
    setText(route.q);
  }, [route.q]);

  // Search follows typing; the history keeps one entry per search, not one per letter
  useEffect(() => {
    if (text === route.q) return;
    const inDataset = !!datasetById(route.ds);
    const next = inDataset ? { ds: route.ds, dir: route.dir, q: text, kind: route.kind } : text ? { ds: "all", q: text, kind: route.kind } : {};
    const t = setTimeout(() => navigate(next, !!route.q), 220);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName)) {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-30 flex justify-center px-4">
      <nav className="glass pointer-events-auto flex h-12 w-full max-w-5xl items-center gap-1 rounded-full pr-2 pl-5">
        <a href={link("/")} className="mr-4 flex shrink-0 items-center" aria-label="Dotadex Files, home">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dotadex" className="h-3.5 opacity-90" />
        </a>
        {SECTIONS.map(([path, title, on]) => (
          <a
            key={path}
            href={link(path)}
            className={`rounded-full px-3.5 py-1.5 text-[0.88rem] font-medium transition-colors ${on(route) ? "glass-inset text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
          >
            {title}
          </a>
        ))}
        <div className="flex-1" />
        <label className="glass-inset flex h-9 w-64 items-center gap-2.5 rounded-full px-4 transition focus-within:w-80">
          <Search size={16} className="shrink-0 text-ink-400" />
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search heroes, items, files"
            className="min-w-0 flex-1 bg-transparent text-[0.9rem] outline-none placeholder:text-ink-400"
          />
          {text ? (
            <button onClick={() => setText("")} aria-label="Clear the search" className="text-ink-400 hover:text-ink-100">
              <X size={15} />
            </button>
          ) : (
            <kbd className="rounded-md border border-white/10 px-1.5 text-[0.7rem] text-ink-400">/</kbd>
          )}
        </label>
      </nav>
    </div>
  );
}
