import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileArchive, Image as ImageIcon, Maximize2, Package, X } from "lucide-react";
import { DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { filesOfRefs, imageUrl, prefabTitle } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { closeItem, link, openItem, openItems } from "../lib/route.js";
import { Button } from "./ui.jsx";
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

// An item opened over the page it was picked on: its model on a stage, and beside it what it is,
// its downloads, the rest of its set and its textures. Back, Esc or a click outside close it; the
// arrows go through the items of the page it came from
export default function ItemModal({ itemId, catalog, indexes, withCopies }) {
  const item = catalog?.items[itemId];
  const files = useMemo(() => (item ? [...filesOfRefs(item.refs, indexes, withCopies).values()] : []), [item, indexes, withCopies]);
  const models = files.filter((e) => e.ext === "glb");
  const textures = files.filter((e) => e.ds === "textures");
  const [style, setStyle] = useState(0);
  const [shown, setShown] = useLook();
  const model = models[Math.min(style, models.length - 1)];
  const list = openItems();
  const at = list.indexOf(itemId);
  const step = (d) => list.length > 1 && at >= 0 && openItem(list[(at + d + list.length) % list.length]);

  useEffect(() => {
    setStyle(0);
  }, [itemId]);
  useEffect(() => {
    const onKey = (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.key === "Escape") closeItem();
      if (e.key === "ArrowLeft") step(-1);
      if (e.key === "ArrowRight") step(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!item) return null;
  const rarity = catalog.rarities[item.rarity || "common"];
  const heroes = item.heroes.map((id) => catalog.heroById.get(id)).filter(Boolean);
  const set = item.set && catalog.sets[item.set];
  const others = set ? set.items.filter((id) => id !== item.id && catalog.items[id]) : [];
  const name = item.name.replace(/[\\/:*?"<>|]/g, "");
  const asDownload = files.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));
  const bytes = files.reduce((n, e) => n + e.size, 0);
  const arrow = "flex h-9 w-9 items-center justify-center rounded-lg bg-black/35 text-ink-100 backdrop-blur transition-colors hover:bg-black/55";

  return (
    <div className="anim-fade fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={item.name} onClick={closeItem}>
      <div key={itemId} className="anim-open absolute inset-5 grid grid-cols-[minmax(0,1fr)_25rem] gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_42%,#3a3a3f_0%,#232326_45%,#161618_100%)]">
          {shown === "game" && models.length > 0 ? (
            <GameStage path={`item/${item.id}`} title={item.name} />
          ) : model ? (
            <Suspense fallback={null}>
              <HeroViewer key={model.path} models={[model]} bare />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center">
              {item.icon ? <img src={imageUrl(item.icon)} alt="" className="max-h-[60%] max-w-[60%] rounded-2xl object-contain shadow-2xl" /> : <Package size={48} strokeWidth={1} className="text-ink-600" />}
            </div>
          )}
          {list.length > 1 && (
            <div className="absolute top-4 left-4 flex gap-1.5">
              <button onClick={() => step(-1)} title="Previous (Left arrow)" aria-label="Previous item" className={arrow}>
                <ChevronLeft size={18} />
              </button>
              <button onClick={() => step(1)} title="Next (Right arrow)" aria-label="Next item" className={arrow}>
                <ChevronRight size={18} />
              </button>
            </div>
          )}
          {models.length > 0 && <LookSwitch look={shown} setLook={setShown} className="absolute top-4 right-4" />}
          {shown === "simple" && models.length > 1 && (
            <div className="absolute inset-x-0 bottom-5 flex justify-center">
              <div className="flex gap-1 rounded-full bg-black/40 p-1 backdrop-blur-md">
                {models.map((m, i) => (
                  <button
                    key={m.path}
                    onClick={() => setStyle(i)}
                    title={m.name}
                    className={`h-8 rounded-full px-3.5 text-[0.82rem] transition-colors ${i === style ? "bg-ink-100 text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
                  >
                    {m.name.replace(/\.glb$/, "").replace(/_/g, " ")}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <aside className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900">
          <div className="flex items-start gap-4 p-6 pb-0">
            {item.icon && <img src={imageUrl(item.icon)} alt="" className="h-16 w-auto shrink-0 rounded-lg" />}
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.3rem] leading-tight font-semibold tracking-[-0.025em]">{item.name}</h2>
              {heroes.length > 0 && (
                <p className="mt-1 text-[0.86rem] text-ink-400">
                  {heroes.map((h, i) => (
                    <span key={h.id}>
                      {i > 0 && ", "}
                      <a href={link(`/hero/${h.key}`)} className="text-ink-300 hover:text-ink-100">
                        {h.name}
                      </a>
                    </span>
                  ))}
                </p>
              )}
            </div>
            <button onClick={closeItem} title="Close (Esc)" aria-label="Close" className="-mt-1 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100">
              <X size={19} />
            </button>
          </div>
          <div className="mt-4 flex flex-wrap gap-1.5 px-6">
            {rarity && (
              <span className="rounded-full bg-ink-800 px-3 py-1 text-[0.8rem]" style={{ color: rarity.color || undefined }}>
                {rarity.name}
              </span>
            )}
            {[item.slot, item.type || prefabTitle(item.prefab)].filter(Boolean).map((t) => (
              <span key={t} className="rounded-full bg-ink-800 px-3 py-1 text-[0.8rem] text-ink-300">
                {t}
              </span>
            ))}
          </div>

          <div className="flex flex-col gap-2 p-6">
            <Button primary onClick={() => startJob("zip", asDownload, name)} disabled={!files.length}>
              <FileArchive size={16} /> Download all <span className="font-normal opacity-55">{files.length} files, {formatSize(bytes)}</span>
            </Button>
            <div className="flex gap-2">
              {model && (
                <Button as="a" href={fileUrl(datasetById("models"), model.path, true)} className="flex-1">
                  <Download size={16} /> Model <span className="font-normal text-ink-400">{formatSize(model.size)}</span>
                </Button>
              )}
              <Button as="a" href={`${DOTADEX}/item/${item.id}`} target="_blank" rel="noreferrer" title="See it in Dotadex, as the game shows it" className="flex-1">
                <ExternalLink size={16} /> Dotadex
              </Button>
              <EmbedButton path={`item/${item.id}`} title={item.name} className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.08] bg-ink-850 px-3 text-[0.9rem] font-medium text-ink-100 transition-colors hover:bg-ink-800" />
              <Button as="a" href={link(`/item/${item.id}`)} onClick={(e) => (e.preventDefault(), (location.href = link(`/item/${item.id}`)))} title="Open its own page" className="px-3">
                <Maximize2 size={15} />
              </Button>
            </div>
          </div>

          <div className="min-h-0 flex-1 space-y-7 overflow-y-auto border-t border-white/[0.06] p-6">
            {others.length > 0 && (
              <section>
                <a href={link(`/set/${item.set}`)} className="font-medium hover:underline">
                  {set.name}
                </a>
                <span className="ml-2 text-[0.8rem] text-ink-400">the whole set</span>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {others.map((id) => (
                    <button
                      key={id}
                      onClick={() => openItem(id)}
                      title={catalog.items[id].name}
                      className="aspect-square overflow-hidden rounded-xl border border-white/[0.06] transition-colors hover:border-white/25"
                    >
                      {catalog.items[id].icon ? <img src={imageUrl(catalog.items[id].icon)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={20} className="m-auto text-ink-600" />}
                    </button>
                  ))}
                </div>
              </section>
            )}
            <section>
              <h3 className="font-medium">Textures</h3>
              {textures.length === 0 ? (
                <p className="mt-2 text-[0.88rem] text-ink-400">No textures of its own.</p>
              ) : (
                <div className="mt-3 grid grid-cols-3 gap-2">
                  {textures.map((t, i) => (
                    <a
                      key={t.path}
                      href={fileUrl(datasetById("textures"), t.path, true)}
                      title={`Download ${t.name}`}
                      style={{ animationDelay: `${i * 30}ms` }}
                      className="anim-card group overflow-hidden rounded-xl border border-white/[0.06] transition-colors hover:border-white/20"
                    >
                      <div className="checker relative flex aspect-square items-center justify-center">
                        {t.ext === "png" ? <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon size={22} className="text-ink-600" />}
                      </div>
                      <div className="truncate px-2 py-1.5 text-[0.74rem] text-ink-300 capitalize">{textureLabel(t.path)}</div>
                    </a>
                  ))}
                </div>
              )}
            </section>
          </div>
        </aside>
      </div>
    </div>
  );
}
