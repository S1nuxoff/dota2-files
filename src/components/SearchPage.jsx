import { useEffect, useMemo, useState } from "react";
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
import { Button, FigureCard, Empty, GRID, Page, SearchField, Section, Segmented, Spinner, Toolbar } from "./ui.jsx";
import { rememberSearch } from "../lib/palette.js";

// How many of a kind show before "Show more"
const FIRST = 12;
const PAGE = 120;
// The datasets whose files are pictures, shown as a grid of them
const PICTURES = new Set(["images", "textures", "models", "videos", "maps"]);

// What a search found across the site: heroes, sets and items by name first, then the files of every
// dataset, each dataset as its files are best seen (pictures in a grid, sounds to play, the rest listed)
export default function SearchPage({ route, catalog, indexes, withCopies }) {
  const q = route.q || "";
  const [tab, setTab] = useState("all");
  const [more, setMore] = useState({});
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  // The page's own field: typing searches again, the history keeping one entry per search
  const [text, setText] = useState(q);
  useEffect(() => {
    if (text.trim() === q || !text.trim()) return;
    const t = setTimeout(() => (rememberSearch(text), navigate({ ds: "all", q: text.trim() }, true)), 350);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new search (from here or from the search window) starts on All
  useEffect(() => {
    setTab("all");
    setMore({});
    setText((t) => (t.trim() === q ? t : q));
  }, [q]);

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

  if (!words.length) return <Page><Empty title="Search for anything" text="A hero, an item, a set, or a file's name." /></Page>;
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
  const moreButton = (key, shown, total) =>
    total > shown && (
      <div className="mt-5">
        <Button ghost size="sm" onClick={() => showAll(key)}>
          {tab === "all" ? `Show all ${formatCount(total)}` : "Show more"}
        </Button>
      </div>
    );

  return (
    <Page>
      <header className="page-x flex flex-col items-center pt-14 pb-3 text-center sm:pt-24 sm:pb-4 lg:pt-28">
        <h1 className="sr-only">Search results for {q}</h1>
        <SearchField big value={text} onChange={setText} placeholder="Search heroes, items, files" className="w-full max-w-2xl" />
        <p className="mt-4 text-[0.92rem] text-ink-400">
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

      </header>
      <Toolbar className="py-0">
        <Segmented variant="line" label="Results" value={tab} onChange={setTab} items={tabs} className="w-full border-b-0" />
      </Toolbar>
      <div key={q} className="page-x">
        {!catalog && <Spinner text="Loading the catalog" />}

        <div className="mt-8 space-y-14">
          {on("heroes") && named.heroes.length > 0 && (
            <Section title="Heroes" count={named.heroes.length}>
              <div className={GRID.tall}>
                {named.heroes.slice(0, shownOf("heroes")).map((hero) => (
                  <FigureCard key={hero.id} href={link(`/hero/${hero.key}`)} src={heroCard(hero)} fallback={heroPortrait(hero)} alt={hero.name} title={hero.name} meta={`${hero.items.length} items, ${hero.sets.length} sets`} />
                ))}
              </div>
              {moreButton("heroes", shownOf("heroes"), named.heroes.length)}
            </Section>
          )}

          {on("sets") && named.sets.length > 0 && (
            <Section title="Sets" count={named.sets.length}>
              <div className={GRID.tall}>
                {named.sets.slice(0, shownOf("sets")).map((set) => (
                  <SetCard key={set.key} set={set} showHero />
                ))}
              </div>
              {moreButton("sets", shownOf("sets"), named.sets.length)}
            </Section>
          )}

          {on("items") && named.items.length > 0 && (
            <Section title="Items" count={named.items.length}>
              <div className={GRID.item}>
                {named.items.slice(0, shownOf("items")).map((item) => (
                  <ItemCard key={item.id} item={item} rarities={catalog.rarities} list={named.items.slice(0, shownOf("items")).map((i) => i.id)} />
                ))}
              </div>
              {moreButton("items", shownOf("items"), named.items.length)}
            </Section>
          )}

          {files.map(({ ds, results, total }) => {
            if (!on(ds.id)) return null;
            const shown = shownOf(ds.id);
            const list = results.slice(0, shown);
            const bytes = results.reduce((n, e) => n + e.size, 0);
            const key = (e) => `${e.ds}:${e.path}`;
            const open = (e) => navigate({ ...route, file: key(e) });
            return (
              <Section
                key={ds.id}
                title={ds.title}
                count={total}
                actions={
                  <Button
                    size="sm"
                    onClick={() => startJob("zip", results.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${ds.repo}/${e.path}` })), `${ds.repo}-${q}`)}
                    title={total > results.length ? `The first ${formatCount(results.length)}` : undefined}
                  >
                    <FileArchive size={15} /> Download {total > results.length ? `the first ${formatCount(results.length)}` : "these"} <span className="font-normal text-ink-400">{formatSize(bytes)}</span>
                  </Button>
                }
              >
                {ds.id === "sounds" ? (
                  <SoundList files={list} route={route} />
                ) : PICTURES.has(ds.id) ? (
                  <div className={GRID.small}>
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
              </Section>
            );
          })}

          {!loading && catalog && totalFiles === 0 && !named.heroes.length && !named.items.length && !named.sets.length && (
            <Empty title="Nothing is called that" text="Try fewer or shorter words, or the game's own name of it." />
          )}
        </div>
      </div>
    </Page>
  );
}
