import { lazy, Suspense, useMemo, useState } from "react";
import { ChevronLeft, Download, ExternalLink, FileArchive, FolderDown, LoaderCircle } from "lucide-react";
import { DATASETS, DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { heroFiles, heroPortrait, prefabTitle } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import { link, navigate } from "../lib/route.js";
import { Button, Chip, Spinner } from "./ui.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// Files of several datasets as a download: <dataset repo>/<path>
const asDownload = (entries) => entries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));

export function DownloadButtons({ entries, title }) {
  const bytes = entries.reduce((s, e) => s + e.size, 0);
  return (
    <div className="flex items-center gap-2">
      <Button primary onClick={() => startJob("zip", asDownload(entries), title)}>
        <FileArchive size={16} /> Download all <span className="font-normal opacity-55">{formatSize(bytes)}</span>
      </Button>
      {canSaveToFolder() && (
        <Button onClick={() => startJob("folder", asDownload(entries), title)} title="Save every file into a folder on your disk">
          <FolderDown size={16} /> To a folder
        </Button>
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

  if (!catalog) return <Spinner text="Loading the catalog" />;
  if (!hero) return <div className="p-16 text-center text-ink-400">There is no hero called {heroKey}.</div>;

  const shown = slot ? items.filter((i) => (i.slot || i.prefab) === slot) : items;
  const tabs = [["items", "Items", items.length], ...DATASETS.filter((d) => byDataset[d.id]).map((d) => [d.id, d.title, byDataset[d.id].length])];
  const bytes = (list) => formatSize(list.reduce((n, e) => n + e.size, 0));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div key={heroKey} className="anim-page mx-auto max-w-[100rem] px-8 pt-6 pb-20">
        <a href={link("/")} className="inline-flex items-center gap-1 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
          <ChevronLeft size={16} /> Heroes
        </a>

        <div className="relative mt-4 h-[min(74vh,50rem)] overflow-hidden rounded-3xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_45%,#3a3a3f_0%,#232326_45%,#141416_100%)]">
          {modelEntry ? (
            <Suspense fallback={null}>
              <HeroViewer models={lookEntries} bare />
            </Suspense>
          ) : (
            <img src={heroPortrait(hero)} alt="" className="h-full w-full object-cover opacity-70" />
          )}

          <div className="pointer-events-none absolute top-0 left-0 p-8">
            <h1 className="text-[3.4rem] leading-none font-semibold tracking-[-0.04em]">{hero.name}</h1>
            <p className="mt-3 text-[0.95rem] text-ink-300">
              {items.length} items{ready && `, ${formatCount(files.length)} files`}
            </p>
          </div>

          {looks.length > 1 && (
            <div className="absolute top-8 right-8 flex gap-1 rounded-full bg-black/35 p-1 backdrop-blur-md">
              {looks.map((l) => (
                <button
                  key={l.id}
                  onClick={() => setLook(l.id)}
                  className={`h-8 rounded-full px-3.5 text-[0.85rem] transition-colors ${look.id === l.id ? "bg-ink-100 text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          )}

          <div className="absolute right-6 bottom-6 flex items-center gap-1.5 rounded-2xl bg-black/40 p-1.5 backdrop-blur-md">
            <a
              href={`${DOTADEX}/hero/${hero.key}${looks.indexOf(look) > 0 ? `?persona=${looks.indexOf(look)}` : ""}`}
              target="_blank"
              rel="noreferrer"
              title="See the hero in Dotadex, as the game shows it"
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10"
            >
              <ExternalLink size={16} /> Dotadex
            </a>
            {modelEntry && (
              <a
                href={fileUrl(datasetById("models"), modelEntry.path, true)}
                title={`${modelEntry.name}, ${formatSize(modelEntry.size)}`}
                className="flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10"
              >
                <Download size={16} /> Body <span className="text-ink-400">{formatSize(modelEntry.size)}</span>
              </a>
            )}
            {lookEntries.length > 1 && (
              <button
                onClick={() => startJob("zip", lookEntries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: e.name })), `${look.id.replace("npc_dota_hero_", "")}-look`)}
                title={`${lookEntries.length} models as you see them`}
                className="flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10"
              >
                <Download size={16} /> Default look <span className="text-ink-400">{bytes(lookEntries)}</span>
              </button>
            )}
            {ready ? (
              <button
                onClick={() => startJob("zip", asDownload(files), hero.key)}
                title="Models, items, sounds, effects, pictures"
                className="flex h-10 items-center gap-2 rounded-xl bg-ink-100 px-4 text-[0.88rem] font-medium text-ink-950 transition-colors hover:bg-white"
              >
                <FileArchive size={16} /> Everything <span className="font-normal opacity-55">{bytes(files)}</span>
              </button>
            ) : (
              <span className="flex h-10 items-center gap-2 px-4 text-[0.85rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )}
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-2">
          {tabs.map(([id, title, count]) => (
            <Chip key={id} active={tab === id} onClick={() => setTab(id)}>
              {title} <span className="ml-1 opacity-50 tabular-nums">{formatCount(count)}</span>
            </Chip>
          ))}
          <div className="flex-1" />
          {tab !== "items" && byDataset[tab] && <DownloadButtons entries={byDataset[tab]} title={`${hero.key}-${tab}`} />}
        </div>

        {tab === "items" ? (
          <div key="items" className="anim-page mt-6">
            <div className="mb-5 flex flex-wrap gap-1.5">
              {["", ...slots].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlot(s)}
                  className={`h-8 rounded-lg px-3 text-[0.84rem] transition-colors ${slot === s ? "bg-ink-800 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
                >
                  {s ? prefabTitleOr(s) : "All"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4">
              {shown.map((item, i) => (
                <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 24) * 20} list={shown.map((x) => x.id)} />
              ))}
            </div>
          </div>
        ) : (
          <div key={tab} className="anim-page mt-6 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
            <FileTable entries={byDataset[tab] || []} route={route} grid={tab === "images" || tab === "textures"} height="70vh" />
          </div>
        )}
      </div>
    </div>
  );
}

export function Loading({ text }) {
  return <Spinner text={text} />;
}
