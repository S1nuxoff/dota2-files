import { useMemo, useState } from "react";
import { FileArchive, FolderDown, LoaderCircle } from "lucide-react";
import { DATASETS, datasetById } from "../datasets.js";
import { heroFiles, heroPortrait, heroVideo, prefabTitle } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";

// Files of several datasets as a download: <dataset repo>/<path>
const asDownload = (entries) => entries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));

export function DownloadButtons({ entries, title }) {
  const bytes = entries.reduce((s, e) => s + e.size, 0);
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => startJob("zip", asDownload(entries), title)}
        className="inline-flex h-9 items-center gap-2 rounded-lg bg-ink-100 px-3.5 text-sm font-medium text-ink-950 hover:bg-white"
      >
        <FileArchive size={15} /> Download all · {formatSize(bytes)}
      </button>
      {canSaveToFolder() && (
        <button
          onClick={() => startJob("folder", asDownload(entries), title)}
          title="Save every file into a folder on your disk"
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-ink-700 px-3 text-sm text-ink-300 hover:border-ink-600 hover:text-ink-100"
        >
          <FolderDown size={15} /> To folder
        </button>
      )}
    </div>
  );
}

export default function HeroPage({ heroKey, catalog, indexes, withCopies, route }) {
  const hero = catalog?.heroByKey.get(heroKey);
  const loaded = DATASETS.filter((d) => indexes[d.id]).length;
  const ready = loaded === DATASETS.length;
  const [slot, setSlot] = useState("");

  const files = useMemo(() => (hero && ready ? heroFiles(hero, catalog, indexes, withCopies) : []), [hero, catalog, indexes, withCopies, ready]);
  const byDataset = useMemo(() => {
    const out = {};
    for (const e of files) (out[e.ds] ??= []).push(e);
    return out;
  }, [files]);
  const items = useMemo(() => (hero ? hero.items.map((id) => catalog.items[id]).filter(Boolean) : []), [hero, catalog]);
  const slots = useMemo(() => [...new Set(items.map((i) => i.slot || i.prefab))].sort(), [items]);
  const prefabTitleOr = (s) => (catalog.prefabs?.[s] ? prefabTitle(s) : s);

  const tab = route.kind && (route.kind === "items" || byDataset[route.kind]) ? route.kind : "items";
  const setTab = (t) => (location.hash = `#/hero/${heroKey}${t === "items" ? "" : `?kind=${t}`}`);

  if (!catalog) return <Loading text="Loading the catalog…" />;
  if (!hero) return <div className="p-10 text-sm text-ink-400">No hero {heroKey}.</div>;

  const shown = slot ? items.filter((i) => (i.slot || i.prefab) === slot) : items;
  const tabs = [["items", "Items", items.length], ...DATASETS.filter((d) => byDataset[d.id]).map((d) => [d.id, d.title, byDataset[d.id].length])];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="relative shrink-0 overflow-hidden border-b border-ink-800">
        <video
          key={hero.id}
          src={heroVideo(hero)}
          poster={heroPortrait(hero)}
          autoPlay
          muted
          loop
          playsInline
          className="absolute inset-y-0 right-0 h-full w-[55%] object-cover opacity-60 [mask-image:linear-gradient(to_right,transparent,black_40%)]"
        />
        <div className="relative px-8 pt-10 pb-6">
          <a href="#/" className="text-xs text-ink-400 hover:text-ink-100">
            Heroes
          </a>
          <h1 className="mt-1 text-4xl font-semibold tracking-tight">{hero.name}</h1>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-ink-400">
            {hero.personas.map((p) => (
              <span key={p.id} className="rounded-full border border-ink-700 px-2.5 py-0.5">
                Persona: {p.name}
              </span>
            ))}
          </div>
          <div className="mt-6 flex items-center gap-4">
            {ready ? (
              <>
                <DownloadButtons entries={files} title={hero.key} />
                <span className="text-xs text-ink-400 tabular-nums">{formatCount(files.length)} files</span>
              </>
            ) : (
              <span className="flex items-center gap-2 text-sm text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering files · {loaded}/{DATASETS.length} lists
              </span>
            )}
          </div>
        </div>
        <div className="relative flex gap-1 px-6">
          {tabs.map(([id, title, count]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`border-b-2 px-3 pb-2.5 text-sm transition ${tab === id ? "border-accent text-ink-100" : "border-transparent text-ink-400 hover:text-ink-100"}`}
            >
              {title} <span className="ml-1 text-xs text-ink-400 tabular-nums">{formatCount(count)}</span>
            </button>
          ))}
        </div>
      </div>

      {tab === "items" ? (
        <div className="min-h-0 flex-1 overflow-y-auto px-8 py-6">
          <div className="mb-5 flex flex-wrap gap-1.5">
            {["", ...slots].map((s) => (
              <button
                key={s}
                onClick={() => setSlot(s)}
                className={`h-7 rounded-full px-3 text-xs transition ${slot === s ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-ink-850 hover:text-ink-100"}`}
              >
                {s ? prefabTitleOr(s) : "All"}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {shown.map((item) => (
              <ItemCard key={item.id} item={item} rarities={catalog.rarities} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col px-5 pt-3">
          <div className="flex items-center justify-end pb-3">
            <DownloadButtons entries={byDataset[tab]} title={`${hero.key}-${tab}`} />
          </div>
          <div className="min-h-0 flex-1">
            <FileTable entries={byDataset[tab]} route={route} grid={tab === "images" || tab === "textures"} />
          </div>
        </div>
      )}
    </div>
  );
}

export function Loading({ text }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 text-sm text-ink-400">
      <LoaderCircle size={16} className="animate-spin" /> {text}
    </div>
  );
}
