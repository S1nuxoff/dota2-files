import { lazy, Suspense, useMemo, useState } from "react";
import { Download, FileArchive, FolderDown, LoaderCircle } from "lucide-react";
import { DATASETS, datasetById, fileUrl } from "../datasets.js";
import { heroFiles, heroPortrait, prefabTitle } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import { link, navigate } from "../lib/route.js";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

function DownloadRow({ title, sub, href, onClick }) {
  const Tag = href ? "a" : "button";
  return (
    <Tag href={href} onClick={onClick} className="group flex w-full items-center gap-4 px-4 py-3 text-left transition first:rounded-t-xl last:rounded-b-xl hover:bg-ink-900">
      <div className="min-w-0 flex-1">
        <div className="text-sm">{title}</div>
        <div className="truncate text-xs text-ink-400">{sub}</div>
      </div>
      <Download size={16} className="text-ink-400 group-hover:text-ink-100" />
    </Tag>
  );
}

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

  // The hero and each persona, each with its body and the models it wears by default
  const looks = hero ? [{ id: hero.id, name: hero.name, model: hero.model, look: hero.look || [] }, ...hero.personas.filter((p) => p.model)] : [];
  const [lookId, setLook] = useState("");
  const look = looks.find((l) => l.id === lookId) || looks[0];
  const lookEntries = useMemo(() => {
    if (!look?.model || !indexes.models) return [];
    const byPath = new Map(indexes.models.entries.map((e) => [e.path, e]));
    return [look.model, ...(look.look || [])].map((p) => byPath.get(p)).filter(Boolean);
  }, [look, indexes.models]);
  const modelEntry = lookEntries[0];

  const tab = route.kind && (route.kind === "items" || byDataset[route.kind]) ? route.kind : "items";
  const setTab = (t) => navigate({ ds: "hero", dir: heroKey, kind: t === "items" ? "" : t }, true);

  if (!catalog) return <Loading text="Loading the catalog…" />;
  if (!hero) return <div className="p-10 text-sm text-ink-400">No hero {heroKey}.</div>;

  const shown = slot ? items.filter((i) => (i.slot || i.prefab) === slot) : items;
  const tabs = [["items", "Items", items.length], ...DATASETS.filter((d) => byDataset[d.id]).map((d) => [d.id, d.title, byDataset[d.id].length])];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-ink-800">
        <div className="grid grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] gap-8 px-8 pt-6">
          <div className="h-[460px] overflow-hidden rounded-xl border border-ink-800">
            {modelEntry ? (
              <Suspense fallback={null}>
                <HeroViewer models={lookEntries} />
              </Suspense>
            ) : (
              <img src={heroPortrait(hero)} alt="" className="h-full w-full object-cover opacity-70" />
            )}
          </div>
          <div className="flex min-w-0 flex-col py-2">
            <a href={link("/")} className="text-xs text-ink-400 hover:text-ink-100">
              Heroes
            </a>
            <div className="mt-3 flex items-center gap-4">
              <img src={heroPortrait(hero)} alt="" className="h-12 rounded-md border border-ink-800" />
              <h1 className="text-4xl font-semibold tracking-tight">{hero.name}</h1>
            </div>
            {looks.length > 1 && (
              <div className="mt-5 flex flex-wrap gap-1.5">
                {looks.map((l) => (
                  <button
                    key={l.id}
                    onClick={() => setLook(l.id)}
                    className={`h-7 rounded-full px-3 text-xs transition ${look.id === l.id ? "bg-ink-100 text-ink-950" : "border border-ink-700 text-ink-400 hover:text-ink-100"}`}
                  >
                    {l.name}
                  </button>
                ))}
              </div>
            )}
            <div className="mt-8 text-[11px] tracking-wider text-ink-400 uppercase">Download</div>
            <div className="mt-3 divide-y divide-ink-800 rounded-xl border border-ink-800">
              {modelEntry && (
                <DownloadRow
                  title="Body model"
                  sub={`${modelEntry.name} · ${formatSize(modelEntry.size)}`}
                  href={fileUrl(datasetById("models"), modelEntry.path, true)}
                />
              )}
              {lookEntries.length > 1 && (
                <DownloadRow
                  title="Default look"
                  sub={`${lookEntries.length} models as you see them · ${formatSize(lookEntries.reduce((n, e) => n + e.size, 0))}`}
                  onClick={() => startJob("zip", lookEntries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: e.name })), `${look.id.replace("npc_dota_hero_", "")}-look`)}
                />
              )}
              {ready ? (
                <DownloadRow
                  title="Everything"
                  sub={`${formatCount(files.length)} files: models, items, sounds, effects, pictures · ${formatSize(files.reduce((n, e) => n + e.size, 0))}`}
                  onClick={() => startJob("zip", asDownload(files), hero.key)}
                />
              ) : (
                <div className="flex h-16 items-center gap-2 px-4 text-sm text-ink-400">
                  <LoaderCircle size={14} className="animate-spin" /> Gathering files · {loaded}/{DATASETS.length} lists
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="mt-5" />
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
