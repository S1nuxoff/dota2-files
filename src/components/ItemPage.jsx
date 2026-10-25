import { lazy, Suspense, useMemo, useState } from "react";
import { ChevronLeft, Download, ExternalLink, FileArchive, Image as ImageIcon, LoaderCircle, Package } from "lucide-react";
import { DATASETS, DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { imageUrl, itemDotadexPath, itemFiles, prefabTitle } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import FileTable, { Row } from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import Loot from "./Loot.jsx";
import { eventKind } from "./CosmeticsPage.jsx";
import SoundList from "./SoundList.jsx";
import { link, navigate } from "../lib/route.js";
import { Spinner } from "./ui.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// axe_body_color_psd_dc021791.png -> axe body color
const textureLabel = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.(png|exr)$/, "")
    .replace(/_[0-9a-f]{6,8}$/, "")
    .replace(/_(psd|tga|png|jpg|vmat_g_\w+)$/, "")
    .replace(/_/g, " ");

// An item's own page (its address opened directly): one wide stage with the item, its name and
// its downloads over it; under it the rest of its set, its textures and every file
export default function ItemPage({ itemId, catalog, indexes, withCopies, route }) {
  const item = catalog?.items[itemId];
  const files = useMemo(() => (item ? itemFiles(item, catalog, indexes, withCopies) : []), [item, catalog, indexes, withCopies]);
  const ready = item && Object.keys(item.refs).every((ds) => indexes[ds]);
  const [style, setStyle] = useState(0);
  const [shown, setShown] = useLook();
  if (!catalog) return <Spinner text="Loading the catalog" />;
  if (!item) return <div className="p-16 text-center text-ink-400">There is no item {itemId}.</div>;

  const rarity = catalog.rarities[item.rarity || "common"];
  const heroes = item.heroes.map((id) => catalog.heroById.get(id)).filter(Boolean);
  const set = item.set && catalog.sets[item.set];
  const models = files.filter((e) => e.ext === "glb");
  const model = models[Math.min(style, models.length - 1)];
  const textures = files.filter((e) => e.ds === "textures");
  const sounds = files.filter((e) => e.ds === "sounds");
  const effects = files.filter((e) => e.ds === "particles");
  const order = Object.fromEntries(DATASETS.map((d, i) => [d.id, i]));
  const sorted = [...files].sort((a, b) => order[a.ds] - order[b.ds] || a.path.localeCompare(b.path));
  const back = heroes[0] ? [link(`/hero/${heroes[0].key}`), heroes[0].name] : [link(`/cosmetics/${item.prefab}`), prefabTitle(item.prefab)];
  const others = set ? set.items.filter((id) => id !== item.id && catalog.items[id]) : [];
  const name = item.name.replace(/[\\/:*?"<>|]/g, "");
  const bytes = files.reduce((n, e) => n + e.size, 0);
  const asDownload = files.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));
  const chip = "rounded-full bg-black/35 px-3 py-1 text-[0.82rem] backdrop-blur";

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div key={itemId} className="anim-page mx-auto max-w-[100rem] px-8 pt-6 pb-20">
        <a href={back[0]} className="inline-flex items-center gap-1 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
          <ChevronLeft size={16} /> {back[1]}
        </a>

        <div className="relative mt-4 h-[min(70vh,46rem)] overflow-hidden rounded-3xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_45%,#3a3a3f_0%,#232326_45%,#141416_100%)]">
          {shown === "game" && models.length > 0 ? (
            <GameStage path={itemDotadexPath(item, catalog)} title={item.name} />
          ) : model ? (
            <Suspense fallback={null}>
              <HeroViewer key={item.bundle ? item.id : model.path} models={item.bundle ? models : [model]} bare />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center">
              {item.icon ? <img src={imageUrl(item.icon)} alt="" className="max-h-[55%] max-w-[55%] rounded-2xl object-contain shadow-2xl" /> : <Package size={52} strokeWidth={1} className="text-ink-600" />}
            </div>
          )}

          <div className="pointer-events-none absolute top-0 left-0 flex max-w-[55%] items-start gap-5 p-8">
            {item.icon && <img src={imageUrl(item.icon)} alt="" className="h-20 w-auto shrink-0 rounded-xl shadow-xl" />}
            <div className="min-w-0">
              <h1 className="text-[2.6rem] leading-[1.02] font-semibold tracking-[-0.035em]">{item.name}</h1>
              <div className="pointer-events-auto mt-4 flex flex-wrap gap-1.5">
                {rarity && (
                  <span className={chip} style={{ color: rarity.color || undefined }}>
                    {rarity.name}
                  </span>
                )}
                {[item.slot, item.type || prefabTitle(item.prefab), item.date?.slice(0, 4)].filter(Boolean).map((t) => (
                  <span key={t} className={`${chip} text-ink-300`}>
                    {t}
                  </span>
                ))}
                {item.event && catalog.events?.[item.event] && (
                  <a href={link(`/cosmetics/${eventKind(item.event)}`)} className={`${chip} text-ink-100 hover:bg-black/55`}>
                    {catalog.events[item.event]}
                  </a>
                )}
                {heroes.map((h) => (
                  <a key={h.id} href={link(`/hero/${h.key}`)} className={`${chip} text-ink-100 hover:bg-black/55`}>
                    {h.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {models.length > 0 && <LookSwitch look={shown} setLook={setShown} className="absolute top-8 right-8" />}
          {shown === "simple" && models.length > 1 && !item.bundle && (
            <div className="absolute bottom-6 left-6 flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md">
              {models.map((m, i) => (
                <button
                  key={m.path}
                  onClick={() => setStyle(i)}
                  className={`h-8 rounded-full px-3.5 text-[0.82rem] transition-colors ${i === style ? "bg-ink-100 text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
                >
                  {m.name.replace(/\.glb$/, "").replace(/_/g, " ")}
                </button>
              ))}
            </div>
          )}

          <div className="absolute right-6 bottom-6 flex items-center gap-1.5 rounded-2xl bg-black/40 p-1.5 backdrop-blur-md">
            <a
              href={`${DOTADEX}/item/${item.id}`}
              target="_blank"
              rel="noreferrer"
              title="See the item in Dotadex, as the game shows it"
              className="flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10"
            >
              <ExternalLink size={16} /> Dotadex
            </a>
            <EmbedButton path={`item/${item.id}`} title={item.name} className="flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10" />
            {model && (
              <a href={fileUrl(datasetById("models"), model.path, true)} className="flex h-10 items-center gap-2 rounded-xl px-4 text-[0.88rem] text-ink-100 transition-colors hover:bg-white/10">
                <Download size={16} /> Model <span className="text-ink-400">{formatSize(model.size)}</span>
              </a>
            )}
            {ready ? (
              <button
                onClick={() => startJob("zip", asDownload, name)}
                className="flex h-10 items-center gap-2 rounded-xl bg-ink-100 px-4 text-[0.88rem] font-medium text-ink-950 transition-colors hover:bg-white"
              >
                <FileArchive size={16} /> Everything <span className="font-normal opacity-55">{files.length} files, {formatSize(bytes)}</span>
              </button>
            ) : (
              <span className="flex h-10 items-center gap-2 px-4 text-[0.85rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )}
          </div>
        </div>

        {others.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">
              <a href={link(`/set/${item.set}`)} className="hover:underline">
                {set.name}
              </a>
            </h2>
            <p className="mt-1 text-[0.9rem] text-ink-400">
              The rest of its set.{" "}
              <a href={link(`/set/${item.set}`)} className="text-ink-100 hover:underline">
                Open the whole set
              </a>
            </p>
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4">
              {others.map((id, i) => (
                <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={i * 25} list={others} />
              ))}
            </div>
          </section>
        )}

        {item.text && <p className="mt-10 max-w-[46rem] leading-relaxed whitespace-pre-line text-ink-300">{item.text}</p>}

        <Loot item={item} catalog={catalog} />

        {effects.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">
              Effects <span className="ml-1 text-[1rem] font-normal text-ink-400">{effects.length}</span>
            </h2>
            <p className="mt-1 text-[0.9rem] text-ink-400">The particle systems it plays, as the game describes them</p>
            <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
              {effects.map((e) => (
                <Row key={e.path} e={e} active={route.file === `${e.ds}:${e.path}`} onOpen={() => navigate({ ...route, file: `${e.ds}:${e.path}` })} />
              ))}
            </div>
          </section>
        )}

        {sounds.length > 0 && (
          <section className="mt-14">
            <SoundList files={sounds} route={route} />
          </section>
        )}

        {textures.length > 0 && (
          <section className="mt-14">
            <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">Textures</h2>
            <p className="mt-1 text-[0.9rem] text-ink-400">Click one to download it</p>
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(10rem,1fr))] gap-3">
              {textures.map((t, i) => (
                <a
                  key={t.path}
                  href={fileUrl(datasetById("textures"), t.path, true)}
                  title={`Download ${t.name}`}
                  style={{ animationDelay: `${i * 25}ms` }}
                  className="anim-card group overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850 transition-colors hover:border-white/[0.14]"
                >
                  <div className="checker relative flex aspect-square items-center justify-center">
                    {t.ext === "png" ? <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon size={24} className="text-ink-600" />}
                    <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Download size={14} />
                    </span>
                  </div>
                  <div className="px-3 py-2.5 leading-tight">
                    <div className="truncate text-[0.84rem] capitalize">{textureLabel(t.path)}</div>
                    <div className="mt-0.5 text-[0.74rem] text-ink-400">{formatSize(t.size)}</div>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        <section className="mt-14">
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">Every file</h2>
          <p className="mt-1 text-[0.9rem] text-ink-400">{files.length} files: model, textures, icon{item.refs.particles ? ", effects" : ""}{item.refs.sounds ? ", sounds" : ""}</p>
          <div className="mt-5 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
            <FileTable entries={sorted} route={route} height={`${Math.min(32, Math.max(1, sorted.length) * 2.75 + 0.5)}rem`} />
          </div>
        </section>
      </div>
    </div>
  );
}
