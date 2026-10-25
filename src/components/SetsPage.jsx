import { useMemo, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { ChevronDown, Search } from "lucide-react";
import { formatCount } from "../lib/format.js";
import { link } from "../lib/route.js";
import SetCard from "./SetCard.jsx";
import HeroPicker from "./HeroPicker.jsx";
import { Chip, PageHead, SearchField, Spinner, Dropdown } from "./ui.jsx";

const PAGE = 240;

// Every set of the game: by name or by hero, searched, filtered to one hero, or laid out hero by hero
export default function SetsPage({ catalog }) {
  const [filter, setFilter] = useState("");
  const [heroKey, setHeroKey] = useState("");
  const [sort, setSort] = useState("name");
  const [grouped, setGrouped] = useState(false);
  const [limit, setLimit] = useState(PAGE);

  const all = useMemo(() => (catalog ? [...catalog.setByKey.values()] : []), [catalog]);
  const shown = useMemo(() => {
    const match = fuzzyMatch(all, (s) => `${s.name} ${s.hero?.name || ""} ${s.hero?.key || ""}`, filter);
    const list = all.filter((s) => (!heroKey || s.hero?.key === heroKey) && (!match || match.has(s)));
    const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
    return list.sort(sort === "items" ? (a, b) => b.items.length - a.items.length || byName(a, b) : byName);
  }, [all, filter, heroKey, sort]);
  // Hero by hero, in the heroes' order of names; sets of no hero last
  const groups = useMemo(() => {
    if (!grouped) return [];
    const by = new Map();
    for (const s of shown) {
      const k = s.hero?.key || "";
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(s);
    }
    return [...by.entries()].sort(([a], [b]) => (!a) - (!b) || (catalog.heroByKey.get(a)?.name || "").localeCompare(catalog.heroByKey.get(b)?.name || ""));
  }, [grouped, shown, catalog]);

  if (!catalog) return <Spinner text="Loading the sets" />;
  const heroesWithSets = catalog.heroes.filter((h) => h.sets.length);
  const grid = "grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4";
  const reset = () => setLimit(PAGE);

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (!grouped && el.scrollTop + el.clientHeight > el.scrollHeight - 800 && limit < shown.length) setLimit(limit + PAGE);
      }}
    >
      <div className="anim-page">
        <PageHead title="Sets" sub={`${formatCount(all.length)} sets of Dota 2, each on its hero, with every file of its items to download at once.`}>
          <SearchField
            value={filter}
            onChange={(v) => {
              setFilter(v);
              reset();
            }}
            icon={Search}
            placeholder="Search by set or hero"
          />
        </PageHead>

        <div className="mx-auto max-w-[128rem] px-8">
          <div className="flex flex-wrap items-center gap-2 pb-6">
            <Chip active={!grouped} onClick={() => setGrouped(false)}>
              All sets
            </Chip>
            <Chip active={grouped} onClick={() => setGrouped(true)}>
              Grouped by hero
            </Chip>
            <div className="flex-1 pl-3 text-[0.88rem] text-ink-400">{formatCount(shown.length)} shown</div>
            <HeroPicker
              heroes={heroesWithSets.map((hero) => ({ hero, count: hero.sets.length }))}
              value={heroKey}
              onChange={(v) => {
                setHeroKey(v);
                reset();
              }}
            />
            <Select value={sort} onChange={setSort} options={[["name", "By name"], ["items", "Most items first"]]} />
          </div>

          {shown.length === 0 && <p className="py-16 text-center text-ink-400">No set has that name.</p>}

          {grouped ? (
            groups.map(([key, sets]) => {
              const hero = catalog.heroByKey.get(key);
              return (
                <section key={key || "none"} className="pb-12">
                  <h2 className="flex items-baseline gap-3 text-[1.25rem] font-semibold tracking-[-0.02em]">
                    {hero ? (
                      <a href={link(`/hero/${hero.key}`)} className="hover:underline">
                        {hero.name}
                      </a>
                    ) : (
                      "Without a hero"
                    )}
                    <span className="text-[0.9rem] font-normal text-ink-400">{sets.length}</span>
                  </h2>
                  <div className={`mt-4 ${grid}`}>
                    {sets.map((set, i) => (
                      <SetCard key={set.key} set={set} delay={Math.min(i, 12) * 20} />
                    ))}
                  </div>
                </section>
              );
            })
          ) : (
            <div className={`${grid} pb-20`}>
              {shown.slice(0, limit).map((set, i) => (
                <SetCard key={set.key} set={set} showHero={!heroKey} delay={Math.min(i, 30) * 15} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Select({ value, onChange, options }) {
  return <Dropdown value={value} onChange={onChange} options={options} />;
}
