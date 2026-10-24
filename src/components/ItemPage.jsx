import { lazy, Suspense, useMemo } from "react";
import { Package } from "lucide-react";
import { DATASETS, datasetById, fileUrl } from "../datasets.js";
import { filesOfRefs, imageUrl, prefabTitle } from "../lib/catalog.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import { DownloadButtons, Loading } from "./HeroPage.jsx";

const ModelPreview = lazy(() => import("./ModelPreview.jsx"));

export default function ItemPage({ itemId, catalog, indexes, withCopies, route }) {
  const item = catalog?.items[itemId];
  const files = useMemo(() => (item ? [...filesOfRefs(item.refs, indexes, withCopies).values()] : []), [item, indexes, withCopies]);
  const ready = item && Object.keys(item.refs).every((ds) => indexes[ds]);
  if (!catalog) return <Loading text="Loading the catalog…" />;
  if (!item) return <div className="p-10 text-sm text-ink-400">No item {itemId}.</div>;

  const rarity = catalog.rarities[item.rarity || "common"];
  const heroes = item.heroes.map((id) => catalog.heroById.get(id)).filter(Boolean);
  const set = item.set && catalog.sets[item.set];
  const model = files.find((e) => e.ext === "glb");
  const order = Object.fromEntries(DATASETS.map((d, i) => [d.id, i]));
  const sorted = [...files].sort((a, b) => order[a.ds] - order[b.ds] || a.path.localeCompare(b.path));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl px-8 py-8">
        <div className="text-xs text-ink-400">
          {heroes.length ? (
            heroes.map((h) => (
              <a key={h.id} href={`#/hero/${h.key}`} className="mr-3 hover:text-ink-100">
                {h.name}
              </a>
            ))
          ) : (
            <a href={`#/cosmetics/${item.prefab}`} className="hover:text-ink-100">
              {prefabTitle(item.prefab)}
            </a>
          )}
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-6">
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-xl border border-ink-800 bg-ink-900">
            {model ? (
              <Suspense fallback={null}>
                <ModelPreview url={fileUrl(datasetById("models"), model.hasGz ? `${model.path}.gz` : model.path)} gz={model.hasGz} />
              </Suspense>
            ) : item.icon ? (
              <img src={imageUrl(item.icon)} alt="" className="max-h-full max-w-full object-contain" />
            ) : (
              <Package size={40} strokeWidth={1} className="text-ink-600" />
            )}
          </div>
          <div className="flex flex-col">
            <div className="flex items-start gap-4">
              {item.icon && <img src={imageUrl(item.icon)} alt="" className="h-16 w-auto rounded-md border border-ink-800" />}
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
                <div className="mt-1.5 flex flex-wrap gap-x-3 text-sm text-ink-400">
                  {rarity && <span style={{ color: rarity.color || undefined }}>{rarity.name}</span>}
                  {item.slot && <span>{item.slot}</span>}
                  <span>{item.type || prefabTitle(item.prefab)}</span>
                  <span>#{item.id}</span>
                </div>
              </div>
            </div>
            <div className="mt-6">{ready ? <DownloadButtons entries={files} title={item.name.replace(/[\\/:*?"<>|]/g, "")} /> : <span className="text-sm text-ink-400">Gathering files…</span>}</div>
            {set && (
              <div className="mt-8">
                <div className="text-[11px] tracking-wider text-ink-400 uppercase">Set · {set.name}</div>
                <div className="mt-3 grid grid-cols-4 gap-2">
                  {set.items
                    .filter((id) => id !== item.id && catalog.items[id])
                    .slice(0, 8)
                    .map((id) => (
                      <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} />
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
        <h2 className="mt-10 mb-3 text-sm font-medium">
          Files <span className="ml-1 text-ink-400 tabular-nums">{files.length}</span>
        </h2>
        <div className="rounded-xl border border-ink-800 p-1">
          <FileTable entries={sorted} route={route} height={Math.min(560, Math.max(1, sorted.length) * 44 + 4)} />
        </div>
      </div>
    </div>
  );
}
