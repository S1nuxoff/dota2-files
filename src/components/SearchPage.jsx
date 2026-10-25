import { useMemo, useState } from "react";
import { FileArchive } from "lucide-react";
import { DATASETS } from "../datasets.js";
import { heroCard, heroPortrait } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { search } from "../lib/lists.js";
import { correctQuery, searchNames } from "../lib/smart.js";
import { startJob } from "../lib/jobs.js";
import { link, navigate } from "../lib/route.js";
import { Cell, Row, withSizes } from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import SetCard from "./SetCard.jsx";
import SoundList from "./SoundList.jsx";
import { Card, Chip, Spinner } from "./ui.jsx";

// How many of a kind show before "Show more"
const FIRST = 12;
const PAGE = 120;
// The datasets whose files are pictures, shown as a grid of them
const GRID = new Set(["images", "textures", "models", "videos", "maps"]);

// What a search found across the site: heroes, sets and items by name first, then the files of every
// dataset, each dataset as its files are best seen (pictures in a grid, sounds to play, the rest listed)
export default function SearchPage({ route, catalog, indexes, withCopies }) {
  const q = route.q || "";
  const [tab, setTab] = useState("all");
  const [more, setMore] = useState({});
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);

  // Names forgive typos and take beginnings (lib/smart.js), best first
  const named = useMemo(() => (catalog && words.length ? searchNames(catalog, q) : { heroes: [], sets: [], items: [] }), [catalog, q]); // eslint-disable-line react-hooks/exhaustive-deps

  // Files by every word in their path or title; when the words as typed find nothing, the words put
  // right against the files' own ("puge" -> "pudge") are searched instead, and the page says so
  const { files, corrected } = useMemo(() => {
    const find = (query) => {
      const out = [];
      for (const d of DATASETS) {
        const index = indexes[d.id];
        if (!index) continue;
        const { results, total } = search(index.entries.filter((e) => !e.path.startsWith("previews/")), query, { withCopies, limit: 3000 });
        if (total) out.push({ ds: d, results, total });
      }
      return out;
    };
    if (!words.length) return { files: [], corrected: "" };
    const typed = find(q);
    if (typed.length) return { files: typed, corrected: "" };
    const fix = correctQuery(indexes, q);
    return fix.changed ? { files: find(fix.query), corrected: fix.query } : { files: typed, corrected: "" };
  }, [indexes, q, withCopies]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!words.length) return <div className="p-16 text-center text-ink-400">Type in the search above.</div>;
  const loading = Object.keys(indexes).length < DATASETS.length;
  const totalFiles = files.reduce((n, f) => n + f.total, 0);
  const shownOf = (key, all) => (tab === "all" ? FIRST : (more[key] || 1) * PAGE);
  const showAll = (key) => (tab === "all" ? setTab(key) : setMore({ ...more, [key]: (more[key] || 1) + 1 }));
  const tabs = [
    ["all", "All", null],
    ...(named.heroes.length ? [["heroes", "Heroes", named.heroes.length]] : []),
    ...(named.sets.length ? [["sets", "Sets", named.sets.length]] : []),
    ...(named.items.length ? [["items", "Items", named.items.length]] : []),
    ...files.map((f) => [f.ds.id, f.ds.title, f.total]),
  ];
  const on = (key) => tab === "all" || tab === key;
  const head = (key, title, count, extra) => (
    <div className="mb-4 flex items-baseline gap-3">
      <h2 className="text-[1.2rem] font-semibold tracking-[-0.02em]">{title}</h2>
      <span className="text-[0.9rem] text-ink-400 tabular-nums">{formatCount(count)}</span>
      <div className="flex-1" />
      {extra}
    </div>
  );
  const moreButton = (key, shown, total) =>
    total > shown && (
      <button onClick={() => showAll(key)} className="mt-4 rounded-lg px-3 py-1.5 text-[0.88rem] text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100">
        {tab === "all" ? `Show all ${formatCount(total)}` : "Show more"}
      </button>
    );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div key={q} className="anim-page mx-auto max-w-[128rem] px-8 pt-10 pb-20">
        <h1 className="text-[2rem] font-semibold tracking-[-0.035em]">“{q}”</h1>
        <p className="mt-2 text-[0.95rem] text-ink-400">
          {[
            named.heroes.length && `${named.heroes.length} heroes`,
            named.sets.length && `${formatCount(named.sets.length)} sets`,
            named.items.length && `${formatCount(named.items.length)} items`,
            `${formatCount(totalFiles)} files`,
          ]
            .filter(Boolean)
            .join(", ")}
          {loading && ", still looking through the file lists"}
        </p>
        {corrected && (
          <p className="mt-2 text-[0.92rem] text-ink-300">
            Files for <button onClick={() => navigate({ ...route, q: corrected })} className="font-medium text-ink-100 underline decoration-white/30 underline-offset-4 hover:decoration-white">{corrected}</button>, as nothing is named “{q}”
          </p>
        )}

        <div className="mt-6 flex flex-wrap gap-2">
          {tabs.map(([key, title, count]) => (
            <Chip key={key} active={tab === key} onClick={() => setTab(key)}>
              {title} {count != null && <span className="ml-1 opacity-50 tabular-nums">{formatCount(count)}</span>}
            </Chip>
          ))}
        </div>

        {!catalog && <Spinner text="Loading the catalog" />}

        <div className="mt-10 space-y-14">
          {on("heroes") && named.heroes.length > 0 && (
            <section>
              {head("heroes", "Heroes", named.heroes.length)}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-4">
                {named.heroes.slice(0, shownOf("heroes")).map((hero) => (
                  <Card
                    key={hero.id}
                    href={link(`/hero/${hero.key}`)}
                    ratio="aspect-[448/678]"
                    title={hero.name}
                    meta={`${hero.items.length} items`}
                    picture={<img src={heroCard(hero)} onError={(e) => (e.currentTarget.src = heroPortrait(hero))} alt="" loading="lazy" className="h-full w-full object-cover object-top" />}
                  />
                ))}
              </div>
              {moreButton("heroes", shownOf("heroes"), named.heroes.length)}
            </section>
          )}

          {on("sets") && named.sets.length > 0 && (
            <section>
              {head("sets", "Sets", named.sets.length)}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4">
                {named.sets.slice(0, shownOf("sets")).map((set) => (
                  <SetCard key={set.key} set={set} showHero />
                ))}
              </div>
              {moreButton("sets", shownOf("sets"), named.sets.length)}
            </section>
          )}

          {on("items") && named.items.length > 0 && (
            <section>
              {head("items", "Items", named.items.length)}
              <div className="grid grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-4">
                {named.items.slice(0, shownOf("items")).map((item) => (
                  <ItemCard key={item.id} item={item} rarities={catalog.rarities} list={named.items.slice(0, shownOf("items")).map((i) => i.id)} />
                ))}
              </div>
              {moreButton("items", shownOf("items"), named.items.length)}
            </section>
          )}

          {files.map(({ ds, results, total }) => {
            if (!on(ds.id)) return null;
            const shown = shownOf(ds.id);
            const list = results.slice(0, shown);
            const bytes = results.reduce((n, e) => n + e.size, 0);
            const key = (e) => `${e.ds}:${e.path}`;
            const open = (e) => navigate({ ...route, file: key(e) });
            return (
              <section key={ds.id}>
                {head(
                  ds.id,
                  ds.title,
                  total,
                  <button
                    onClick={() => startJob("zip", results.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${ds.repo}/${e.path}` })), `${ds.repo}-${q}`)}
                    title={total > results.length ? `The first ${formatCount(results.length)}` : undefined}
                    className="flex h-9 items-center gap-2 rounded-lg border border-white/[0.08] bg-ink-850 px-3 text-[0.86rem] text-ink-100 transition-colors hover:bg-ink-800"
                  >
                    <FileArchive size={15} /> Download {total > results.length ? `the first ${formatCount(results.length)}` : "these"} <span className="text-ink-400">{formatSize(bytes)}</span>
                  </button>
                )}
                {ds.id === "sounds" ? (
                  <SoundList files={list} route={route} />
                ) : GRID.has(ds.id) ? (
                  <div className="grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-2">
                    {withSizes(list).map((e) => (
                      <Cell key={key(e)} e={e} active={route.file === key(e)} onOpen={() => open(e)} />
                    ))}
                  </div>
                ) : (
                  <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
                    {list.map((e) => (
                      <Row key={key(e)} e={e} active={route.file === key(e)} onOpen={() => open(e)} />
                    ))}
                  </div>
                )}
                {moreButton(ds.id, shown, total)}
              </section>
            );
          })}

          {!loading && catalog && totalFiles === 0 && !named.heroes.length && !named.items.length && !named.sets.length && (
            <p className="py-16 text-center text-ink-400">Nothing is called that. Try fewer or shorter words.</p>
          )}
        </div>
      </div>
    </div>
  );
}
