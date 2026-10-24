import { useState } from "react";
import { LoaderCircle, Search } from "lucide-react";
import { heroPortrait } from "../lib/catalog.js";

export default function HeroesPage({ catalog, error }) {
  const [filter, setFilter] = useState("");
  if (!catalog) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-sm text-ink-400">
        {error ? `The catalog could not be loaded: ${error}` : <><LoaderCircle size={16} className="animate-spin" /> Loading heroes…</>}
      </div>
    );
  }
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const heroes = catalog.heroes.filter((h) => words.every((w) => h.name.toLowerCase().includes(w)));
  return (
    <div className="overflow-y-auto">
      <div className="mx-auto max-w-6xl px-10 py-12">
        <div className="flex items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold tracking-tight">Heroes</h1>
            <p className="mt-2 text-ink-400">Pick a hero: every model, persona, item, sound, effect and picture of it in one place.</p>
          </div>
          <label className="flex h-9 w-64 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 focus-within:border-ink-600">
            <Search size={14} className="text-ink-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter heroes"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
          </label>
        </div>
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
          {heroes.map((hero) => (
            <a key={hero.id} href={`#/hero/${hero.key}`} className="group overflow-hidden rounded-lg border border-ink-800 bg-ink-900 transition hover:border-ink-600">
              <div className="aspect-[16/9] overflow-hidden bg-ink-850">
                <img src={heroPortrait(hero)} loading="lazy" alt="" className="h-full w-full object-cover transition duration-300 group-hover:scale-105" />
              </div>
              <div className="flex items-center justify-between px-3 py-2">
                <span className="truncate text-sm">{hero.name}</span>
                <span className="text-[11px] text-ink-400 tabular-nums">{hero.items.length}</span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
