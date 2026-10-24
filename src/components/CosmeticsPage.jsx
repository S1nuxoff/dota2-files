import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { prefabTitle } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import ItemCard from "./ItemCard.jsx";
import { Loading } from "./HeroPage.jsx";

const PAGE = 240;

// Every item of a kind (couriers, wards, loading screens...), or the kinds to pick from
export default function CosmeticsPage({ prefab, catalog }) {
  const [filter, setFilter] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const kinds = useMemo(() => {
    if (!catalog) return [];
    const count = {};
    for (const item of Object.values(catalog.items)) count[item.prefab] = (count[item.prefab] || 0) + 1;
    return Object.entries(count).sort((a, b) => b[1] - a[1]);
  }, [catalog]);
  const items = useMemo(() => {
    if (!catalog || !prefab) return [];
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
    return Object.values(catalog.items).filter((i) => i.prefab === prefab && words.every((w) => i.name.toLowerCase().includes(w)));
  }, [catalog, prefab, filter]);
  if (!catalog) return <Loading text="Loading the catalog…" />;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto" onScroll={(e) => {
      const el = e.currentTarget;
      if (el.scrollTop + el.clientHeight > el.scrollHeight - 600 && limit < items.length) setLimit(limit + PAGE);
    }}>
      <div className="mx-auto max-w-6xl px-10 py-12">
        <div className="flex items-end justify-between gap-6">
          <div>
            <a href="#/cosmetics" className="text-xs text-ink-400 hover:text-ink-100">
              Cosmetics
            </a>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight">{prefab ? prefabTitle(prefab) : "Cosmetics"}</h1>
          </div>
          {prefab && (
            <label className="flex h-9 w-64 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 focus-within:border-ink-600">
              <Search size={14} className="text-ink-400" />
              <input
                value={filter}
                onChange={(e) => (setFilter(e.target.value), setLimit(PAGE))}
                placeholder="Filter by name"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
              />
            </label>
          )}
        </div>
        {prefab ? (
          <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {items.slice(0, limit).map((item) => (
              <ItemCard key={item.id} item={item} rarities={catalog.rarities} />
            ))}
          </div>
        ) : (
          <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-2">
            {kinds.map(([kind, n]) => (
              <a key={kind} href={`#/cosmetics/${kind}`} className="flex items-center justify-between rounded-lg border border-ink-800 bg-ink-900 px-4 py-3 text-sm hover:border-ink-600">
                {prefabTitle(kind)}
                <span className="text-xs text-ink-400 tabular-nums">{formatCount(n)}</span>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
