import { useEffect, useRef, useState } from "react";
import { Search, X } from "lucide-react";
import { navigate } from "../lib/route.js";

export default function Header({ route, ds }) {
  const [text, setText] = useState(route.q);
  const input = useRef(null);
  useEffect(() => setText(route.q), [route.q]);

  // Search follows typing; the history keeps one entry per search, not one per letter
  useEffect(() => {
    if (text === route.q) return;
    const inDataset = route.ds && route.ds !== "all";
    // Search from the overview covers every dataset; cleared there, it goes back to the overview
    const next = inDataset ? { ds: route.ds, dir: route.dir, q: text, kind: route.kind } : text ? { ds: "all", q: text, kind: route.kind } : {};
    const t = setTimeout(() => navigate(next, !!route.q), 200);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <header className="flex h-14 shrink-0 items-center gap-6 border-b border-ink-800 px-5">
      <a href="#/" className="flex shrink-0 items-center gap-3">
        <img src="./logo.png" alt="Dotadex" className="h-4 opacity-90" />
        <span className="text-sm font-medium tracking-wide text-ink-400">Files</span>
      </a>
      <label className="flex h-9 max-w-xl flex-1 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 transition focus-within:border-ink-600">
        <Search size={15} className="text-ink-400" />
        <input
          ref={input}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={ds ? `Search ${ds.title.toLowerCase()} by name or path` : "Search every file by name or path"}
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
        />
        {text ? (
          <button onClick={() => setText("")} className="text-ink-400 hover:text-ink-100">
            <X size={15} />
          </button>
        ) : (
          <kbd className="rounded border border-ink-700 px-1.5 text-[11px] text-ink-400">/</kbd>
        )}
      </label>
      <div className="flex-1" />
      <a href="https://huggingface.co/Sqls1" target="_blank" rel="noreferrer" className="text-xs text-ink-400 hover:text-ink-100">
        Hugging Face
      </a>
    </header>
  );
}
