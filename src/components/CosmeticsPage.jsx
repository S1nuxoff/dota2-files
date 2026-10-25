import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { prefabTitle } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import ItemCard from "./ItemCard.jsx";
import { link } from "../lib/route.js";
import { PageHead, SearchField, Spinner } from "./ui.jsx";

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
  // A picture for each kind: the icon of one of its items
  const covers = useMemo(() => {
    if (!catalog) return {};
    const out = {};
    for (const item of Object.values(catalog.items)) if (item.icon && !out[item.prefab]) out[item.prefab] = item.icon;
    return out;
  }, [catalog]);
  if (!catalog) return <Spinner text="Loading the catalog" />;

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 800 && limit < items.length) setLimit(limit + PAGE);
      }}
    >
      <div key={prefab || "kinds"} className="anim-page">
        {prefab ? (
          <>
            <div className="mx-auto max-w-[100rem] px-8 pt-6">
              <a href={link("/cosmetics")} className="inline-flex items-center gap-1 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
                <ChevronLeft size={16} /> Cosmetics
              </a>
            </div>
            <PageHead title={prefabTitle(prefab)} sub={`${formatCount(items.length)} of them, each with its model, textures and icon.`}>
              <SearchField
                value={filter}
                onChange={(v) => {
                  setFilter(v);
                  setLimit(PAGE);
                }}
                icon={Search}
                placeholder="Search by name"
              />
            </PageHead>
            <div className="mx-auto grid max-w-[100rem] grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4 px-8 pb-20">
              {items.slice(0, limit).map((item, i) => (
                <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 30) * 15} list={items.map((x) => x.id)} />
              ))}
            </div>
          </>
        ) : (
          <>
            <PageHead title="Cosmetics" sub="Everything a player can own, by kind: couriers, wards, loading screens, music, effects and the heroes' items." />
            <div className="mx-auto grid max-w-[100rem] grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4 px-8 pb-20">
              {kinds.map(([kind, n], i) => (
                <a
                  key={kind}
                  href={link(`/cosmetics/${kind}`)}
                  style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }}
                  className="anim-card group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-ink-850 p-3 transition-colors hover:border-white/[0.14]"
                >
                  <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_45%,#26262a_0%,#18181b_72%)]">
                    {covers[kind] && (
                      <img
                        src={`https://huggingface.co/datasets/Sqls1/dota2-images/resolve/main/${covers[kind]}`}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.06]"
                      />
                    )}
                  </div>
                  <div className="min-w-0 leading-tight">
                    <div className="truncate text-[0.95rem] font-medium">{prefabTitle(kind)}</div>
                    <div className="mt-1 text-[0.82rem] text-ink-400 tabular-nums">{formatCount(n)}</div>
                  </div>
                </a>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
