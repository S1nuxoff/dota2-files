import { useMemo, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { formatCount } from "../lib/format.js";
import { link } from "../lib/route.js";
import SetCard from "./SetCard.jsx";
import HeroPicker, { heroIcon } from "./HeroPicker.jsx";
import { CosmeticsTabs } from "./CosmeticsPage.jsx";
import { Dropdown, Empty, GRID, Page, PageHead, SearchField, Section, Segmented, Spinner, Toolbar, useMore, LoadingList } from "./ui.jsx";

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

  const more = useMore(() => setLimit((l) => l + PAGE), !grouped && limit < shown.length);
  if (!catalog) return <LoadingList title="Sets" ratio="aspect-[448/678]" grid={GRID.tall} count={24} tabs={<CosmeticsTabs current="/sets" />} />;
  const heroesWithSets = catalog.heroes.filter((h) => h.sets.length);
  const reset = () => setLimit(PAGE);

  return (
    <Page>
      <PageHead title="Sets" sub="Every set of the game on its hero, with every file of its items to download at once."
        search={
          <SearchField
            big
            value={filter}
            onChange={(v) => {
              setFilter(v);
              reset();
            }}
            placeholder={`Search ${formatCount(all.length)} sets by name or hero`}
          />
        }
      >
        <CosmeticsTabs current="/sets" />
      </PageHead>

      <Toolbar>
        <Segmented
          label="Layout"
          value={grouped ? "hero" : "all"}
          onChange={(v) => setGrouped(v === "hero")}
          items={[
            ["all", "All sets"],
            ["hero", "By hero"],
          ]}
        />
        <div className="grid grid-cols-2 gap-2 max-sm:w-full sm:flex sm:items-center">
          <HeroPicker
            heroes={heroesWithSets.map((hero) => ({ hero, count: hero.sets.length }))}
            value={heroKey}
            onChange={(v) => {
              setHeroKey(v);
              reset();
            }}
            className="[&>button]:w-full [&>button]:min-w-0 sm:[&>button]:min-w-[13rem]"
          />
          <Dropdown value={sort} onChange={setSort} label="Sort" options={[["name", "By name"], ["items", "Most items first"]]} />
        </div>
      </Toolbar>

      <div className="page-x pt-4">
        {(filter || heroKey) && <p className="mb-5 text-[0.86rem] text-ink-400 tabular-nums">{formatCount(shown.length)} of {formatCount(all.length)}</p>}
        {shown.length === 0 && <Empty title="No set has that name" text="Try the hero's name, or a shorter word." />}

        {grouped ? (
          <div className="space-y-12">
            {groups.map(([key, sets]) => {
              const hero = catalog.heroByKey.get(key);
              return (
                <Section
                  key={key || "none"}
                  title={
                    hero ? (
                      <a href={link(`/hero/${hero.key}`)} className="flex items-center gap-2.5 hover:underline">
                        <img src={heroIcon(hero)} alt="" className="h-6 w-6 rounded-md" />
                        {hero.name}
                      </a>
                    ) : (
                      "Without a hero"
                    )
                  }
                  count={sets.length}
                >
                  <div className={GRID.tall}>
                    {sets.map((set, i) => (
                      <SetCard key={set.key} set={set} delay={Math.min(i, 12) * 20} />
                    ))}
                  </div>
                </Section>
              );
            })}
          </div>
        ) : (
          <div className={GRID.tall}>
            {shown.slice(0, limit).map((set, i) => (
              <SetCard key={set.key} set={set} showHero={!heroKey} delay={Math.min(i, 30) * 15} />
            ))}
          </div>
        )}
        <div ref={more} />
      </div>
    </Page>
  );
}
