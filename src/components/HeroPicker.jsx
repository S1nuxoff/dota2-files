import { useEffect, useRef, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";

// The game's small hero icon (the minimap's)
export const heroIcon = (hero) => fileUrl(datasetById("images"), `panorama/images/heroes/icons/${hero.id}_png.png`);

// A hero to pick, from a list with the heroes' icons, searchable; heroes: [{ hero, count }]
export default function HeroPicker({ heroes, value, onChange, anyLabel = "Any hero", className = "" }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const box = useRef(null);
  const input = useRef(null);
  useEffect(() => {
    if (!open) return;
    input.current?.focus();
    const onDown = (e) => !box.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const picked = heroes.find((h) => h.hero.key === value)?.hero;
  const match = fuzzyMatch(heroes, ({ hero }) => `${hero.name} ${hero.key}`, query);
  const shown = heroes.filter((h) => !match || match.has(h));
  const pick = (key) => {
    onChange(key);
    setOpen(false);
    setQuery("");
  };
  const row = (active) => `flex w-full items-center gap-3 rounded-lg px-2.5 py-1.5 text-left text-[0.88rem] transition-colors ${active ? "bg-ink-800 text-ink-100" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100"}`;

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="flex h-10 min-w-[13rem] items-center gap-2.5 rounded-lg border border-white/[0.08] bg-ink-850 pr-3 pl-2.5 text-[0.88rem] text-ink-100 transition-colors hover:bg-ink-800"
      >
        {picked ? <img src={heroIcon(picked)} alt="" className="h-6 w-6 rounded" /> : <span className="h-6 w-6 rounded bg-ink-700" />}
        <span className="flex-1 truncate text-left">{picked ? picked.name : anyLabel}</span>
        {picked ? (
          <X
            size={15}
            className="text-ink-400 hover:text-ink-100"
            onClick={(e) => {
              e.stopPropagation();
              pick("");
            }}
          />
        ) : (
          <ChevronDown size={15} className="text-ink-400" />
        )}
      </button>
      {open && (
        <div className="anim-open absolute top-full right-0 z-30 mt-2 w-72 overflow-hidden rounded-2xl border border-white/[0.08] bg-ink-900 shadow-2xl shadow-black/60">
          <label className="flex items-center gap-2.5 border-b border-white/[0.06] px-3.5 py-2.5">
            <Search size={15} className="text-ink-400" />
            <input ref={input} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a hero" className="min-w-0 flex-1 bg-transparent text-[0.88rem] outline-none placeholder:text-ink-400" />
          </label>
          <div className="max-h-[22rem] overflow-y-auto p-1.5">
            {!query && (
              <button onClick={() => pick("")} className={row(!value)}>
                <span className="h-6 w-6 rounded bg-ink-700" />
                <span className="flex-1">{anyLabel}</span>
                {!value && <Check size={15} />}
              </button>
            )}
            {shown.map(({ hero, count }) => (
              <button key={hero.key} onClick={() => pick(hero.key)} className={row(value === hero.key)}>
                <img src={heroIcon(hero)} alt="" loading="lazy" className="h-6 w-6 rounded" />
                <span className="flex-1 truncate">{hero.name}</span>
                {count != null && <span className="text-[0.78rem] text-ink-400 tabular-nums">{count}</span>}
                {value === hero.key && <Check size={15} />}
              </button>
            ))}
            {shown.length === 0 && <p className="px-3 py-4 text-center text-[0.85rem] text-ink-400">No hero is called that.</p>}
          </div>
        </div>
      )}
    </div>
  );
}
