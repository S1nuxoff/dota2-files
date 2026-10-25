import { lazy, Suspense, useMemo } from "react";
import { ChevronLeft, LoaderCircle, Package } from "lucide-react";
import { DATASETS } from "../datasets.js";
import { filesOfRefs, imageUrl, prefabTitle } from "../lib/catalog.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import { DownloadButtons } from "./HeroPage.jsx";
import { link } from "../lib/route.js";
import { Spinner } from "./ui.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

export default function ItemPage({ itemId, catalog, indexes, withCopies, route }) {
  const item = catalog?.items[itemId];
  const files = useMemo(() => (item ? [...filesOfRefs(item.refs, indexes, withCopies).values()] : []), [item, indexes, withCopies]);
  const ready = item && Object.keys(item.refs).every((ds) => indexes[ds]);
  if (!catalog) return <Spinner text="Loading the catalog" />;
  if (!item) return <div className="p-16 text-center text-ink-400">There is no item {itemId}.</div>;

  const rarity = catalog.rarities[item.rarity || "common"];
  const heroes = item.heroes.map((id) => catalog.heroById.get(id)).filter(Boolean);
  const set = item.set && catalog.sets[item.set];
  const model = files.find((e) => e.ext === "glb");
  const order = Object.fromEntries(DATASETS.map((d, i) => [d.id, i]));
  const sorted = [...files].sort((a, b) => order[a.ds] - order[b.ds] || a.path.localeCompare(b.path));
  const back = heroes[0] ? [link(`/hero/${heroes[0].key}`), heroes[0].name] : [link(`/cosmetics/${item.prefab}`), prefabTitle(item.prefab)];
  const others = set ? set.items.filter((id) => id !== item.id && catalog.items[id]) : [];

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div key={itemId} className="anim-page mx-auto max-w-[100rem] px-8 pt-6 pb-20">
        <a href={back[0]} className="inline-flex items-center gap-1 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
          <ChevronLeft size={16} /> {back[1]}
        </a>

        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_24rem] gap-4">
          <div className="relative flex h-[min(62vh,40rem)] items-center justify-center overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_42%,#3a3a3f_0%,#232326_45%,#161618_100%)]">
            {model ? (
              <Suspense fallback={null}>
                <HeroViewer models={[model]} bare />
              </Suspense>
            ) : item.icon ? (
              <img src={imageUrl(item.icon)} alt="" className="max-h-[70%] max-w-[70%] rounded-xl object-contain" />
            ) : (
              <Package size={44} strokeWidth={1} className="text-ink-600" />
            )}
          </div>

          <aside className="flex flex-col rounded-2xl border border-white/[0.06] bg-ink-900 p-6">
            {item.icon && <img src={imageUrl(item.icon)} alt="" className="h-20 w-fit rounded-lg" />}
            <h1 className="mt-4 text-[1.9rem] leading-[1.1] font-semibold tracking-[-0.03em]">{item.name}</h1>
            <div className="mt-4 flex flex-wrap gap-1.5">
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
            {heroes.length > 0 && (
              <p className="mt-4 text-[0.9rem] text-ink-400">
                For{" "}
                {heroes.map((h, i) => (
                  <span key={h.id}>
                    {i > 0 && ", "}
                    <a href={link(`/hero/${h.key}`)} className="text-ink-100 hover:underline">
                      {h.name}
                    </a>
                  </span>
                ))}
              </p>
            )}
            <div className="flex-1" />
            <div className="mt-6 border-t border-white/[0.06] pt-5">
              {ready ? (
                <DownloadButtons entries={files} title={item.name.replace(/[\\/:*?"<>|]/g, "")} />
              ) : (
                <span className="flex items-center gap-2 text-[0.88rem] text-ink-400">
                  <LoaderCircle size={14} className="animate-spin" /> Gathering its files
                </span>
              )}
              <p className="mt-3 text-[0.8rem] text-ink-400">
                {files.length} files: model, textures, icon{item.refs.particles ? ", effects" : ""}
                {item.refs.sounds ? ", sounds" : ""}
              </p>
            </div>
          </aside>
        </div>

        {others.length > 0 && (
          <section className="mt-12">
            <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">{set.name}</h2>
            <p className="mt-1 text-[0.88rem] text-ink-400">The rest of its set</p>
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4">
              {others.map((id, i) => (
                <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={i * 25} />
              ))}
            </div>
          </section>
        )}

        <section className="mt-12">
          <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">Files</h2>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
            <FileTable entries={sorted} route={route} height={`${Math.min(32, Math.max(1, sorted.length) * 2.75 + 0.5)}rem`} />
          </div>
        </section>
      </div>
    </div>
  );
}
