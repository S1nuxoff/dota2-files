import { lazy, Suspense, useMemo } from "react";
import { ChevronLeft, ExternalLink, FileArchive, LoaderCircle } from "lucide-react";
import { DATASETS, DOTADEX, datasetById } from "../datasets.js";
import { imageUrl, setDotadexPath, setFiles, setModels } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { link } from "../lib/route.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";
import { Spinner } from "./ui.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// A set: its hero wearing it on one wide stage (this site's viewer, or Dotadex's with Game look),
// its name and downloads over it; under it its items and every file of them
export default function SetPage({ setKey, catalog, indexes, withCopies, route }) {
  const set = catalog?.setByKey.get(setKey);
  const [lookMode, setLookMode] = useLook();
  const ready = DATASETS.every((d) => indexes[d.id]);
  const files = useMemo(() => (set && ready ? setFiles(set, catalog, indexes, withCopies) : []), [set, catalog, indexes, withCopies, ready]);
  const worn = useMemo(() => {
    if (!set || !indexes.models) return [];
    const body = set.hero?.model && indexes.models.entries.find((e) => e.path === set.hero.model);
    return [body, ...setModels(set, catalog, indexes)].filter(Boolean);
  }, [set, catalog, indexes]);
  if (!catalog) return <Spinner text="Loading the catalog" />;
  if (!set) return <div className="p-16 text-center text-ink-400">There is no set {setKey}.</div>;

  const hero = set.hero;
  const dotadex = setDotadexPath(set, catalog);
  const order = Object.fromEntries(DATASETS.map((d, i) => [d.id, i]));
  const sorted = [...files].sort((a, b) => order[a.ds] - order[b.ds] || a.path.localeCompare(b.path));
  const bytes = files.reduce((n, e) => n + e.size, 0);
  const name = set.name.replace(/[\\/:*?"<>|]/g, "");
  const asDownload = files.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));
  const barButton = "flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div key={setKey} className="anim-page mx-auto max-w-[100rem] px-8 pt-6 pb-20">
        <a href={hero ? link(`/hero/${hero.key}`) : link("/cosmetics")} className="inline-flex items-center gap-1 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
          <ChevronLeft size={16} /> {hero ? hero.name : "Cosmetics"}
        </a>

        <div className="relative mt-4 h-[min(72vh,48rem)] overflow-hidden rounded-3xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_45%,#3a3a3f_0%,#232326_45%,#141416_100%)]">
          {lookMode === "game" && dotadex ? (
            <GameStage path={dotadex} title={set.name} />
          ) : worn.length ? (
            <Suspense fallback={null}>
              <HeroViewer key={worn.map((e) => e.path).join("|")} models={worn} bare />
            </Suspense>
          ) : set.icon ? (
            <img src={imageUrl(set.icon)} alt="" className="mx-auto h-full object-contain" />
          ) : null}

          <div className="pointer-events-none absolute top-0 left-0 max-w-[50%] p-8">
            <h1 className="text-[2.8rem] leading-[1.02] font-semibold tracking-[-0.035em]">{set.name}</h1>
            <p className="mt-3 text-[0.95rem] text-ink-300">
              {set.items.length} items{hero && <> for <a href={link(`/hero/${hero.key}`)} className="pointer-events-auto text-ink-100 hover:underline">{hero.name}</a></>}
            </p>
          </div>
          {dotadex && <LookSwitch look={lookMode} setLook={setLookMode} className="absolute top-8 right-8" />}

          <div className="absolute right-6 bottom-6 flex items-center gap-1.5 rounded-2xl bg-black/40 p-1.5 backdrop-blur-md">
            {dotadex && (
              <a href={`${DOTADEX}/${dotadex}`} target="_blank" rel="noreferrer" title="See the set on its hero in Dotadex" className={barButton}>
                <ExternalLink size={16} /> Dotadex
              </a>
            )}
            {dotadex && <EmbedButton path={dotadex} title={set.name} className={barButton} />}
            {ready ? (
              <button onClick={() => startJob("zip", asDownload, name)} className="flex h-10 items-center gap-2 rounded-xl bg-ink-100 px-4 text-[0.88rem] font-medium text-ink-950 transition-colors hover:bg-white">
                <FileArchive size={16} /> Whole set <span className="font-normal opacity-55">{files.length} files, {formatSize(bytes)}</span>
              </button>
            ) : (
              <span className="flex h-10 items-center gap-2 px-4 text-[0.85rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )}
          </div>
        </div>

        <section className="mt-14">
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">In this set</h2>
          <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4">
            {set.items.map((id, i) => (
              <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={i * 25} list={set.items} />
            ))}
          </div>
        </section>

        <section className="mt-14">
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">Every file</h2>
          <p className="mt-1 text-[0.9rem] text-ink-400">{files.length} files of its items: models, textures, icons, effects</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
            <FileTable entries={sorted} route={route} height={`${Math.min(36, Math.max(1, sorted.length) * 2.75 + 0.5)}rem`} />
          </div>
        </section>
      </div>
    </div>
  );
}
