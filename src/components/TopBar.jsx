import { useEffect, useRef, useState } from "react";
import { Code, Coffee, Database, Search, X } from "lucide-react";
import { link, navigate } from "../lib/route.js";
import { datasetById } from "../datasets.js";
import { KINDS } from "../lib/format.js";

// Where the files and the code come from, and where to support the work
const OUTSIDE = [
  ["https://huggingface.co/Sqls1", "Datasets", Database, "The Hugging Face datasets every file comes from"],
  ["https://github.com/S1nuxoff/dota2-files", "Source", Code, "This site's source code on GitHub"],
];
const KOFI = "https://ko-fi.com/s1nuxoff";

const SECTIONS = [
  ["/", "Heroes", (r) => !r.ds || r.ds === "hero"],
  ["/sets", "Sets", (r) => r.ds === "sets" || r.ds === "set"],
  ["/3d", "3D models", (r) => r.ds === "3d"],
  ["/cosmetics", "Cosmetics", (r) => (r.ds === "cosmetics" && r.dir !== "treasures") || r.ds === "item"],
  ["/music", "Music", (r) => r.ds === "music"],
  ["/cosmetics/treasures", "Treasures", (r) => r.ds === "cosmetics" && r.dir === "treasures"],
  ["/files", "Files", (r) => r.ds === "files" || !!datasetById(r.ds) || r.ds === "all"],
];

// The site's bar: the full width, a hairline under it; the sections on the left, the search on the right
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
    // The filter by kind of file goes along, not a hero page's tab (kind=sounds there)
    const kind = KINDS.some((k) => k.id === route.kind) ? route.kind : undefined;
    const next = inDataset ? { ds: route.ds, dir: route.dir, q: text, kind } : text ? { ds: "all", q: text, kind } : {};
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
    <header className="fixed inset-x-0 top-0 z-30 border-b border-white/[0.06] bg-ink-950/85 backdrop-blur-xl">
      <nav className="mx-auto flex h-14 max-w-[100rem] items-center gap-8 px-8">
        <a href={link("/")} className="flex shrink-0 items-center" aria-label="Dotadex Files, home">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dotadex" className="h-3.5" />
        </a>
        <div className="flex items-center gap-6">
          {SECTIONS.map(([path, title, on]) => (
            <a key={path} href={link(path)} className={`text-[0.92rem] transition-colors ${on(route) ? "text-ink-100" : "text-ink-400 hover:text-ink-100"}`}>
              {title}
            </a>
          ))}
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-5">
          {OUTSIDE.map(([href, title, Icon, hint]) => (
            <a key={href} href={href} target="_blank" rel="noreferrer" title={hint} className="flex items-center gap-1.5 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
              <Icon size={15} /> {title}
            </a>
          ))}
          <a
            href={KOFI}
            target="_blank"
            rel="noreferrer"
            title="Support the project on Ko-fi"
            className="flex h-8 items-center gap-1.5 rounded-lg bg-ink-800 px-3 text-[0.85rem] text-ink-100 transition-colors hover:bg-ink-700"
          >
            <Coffee size={15} /> Ko-fi
          </a>
        </div>
        <label className="flex h-9 w-64 items-center gap-2.5 rounded-lg border border-white/[0.08] bg-ink-900 px-3 transition-colors focus-within:border-white/20">
          <Search size={15} className="shrink-0 text-ink-400" />
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Search heroes, items, files"
            className="min-w-0 flex-1 bg-transparent text-[0.88rem] outline-none placeholder:text-ink-400"
          />
          {text ? (
            <button onClick={() => setText("")} aria-label="Clear the search" className="text-ink-400 hover:text-ink-100">
              <X size={14} />
            </button>
          ) : (
            <kbd className="rounded border border-white/10 px-1.5 text-[0.7rem] text-ink-400">/</kbd>
          )}
        </label>
      </nav>
    </header>
  );
}
