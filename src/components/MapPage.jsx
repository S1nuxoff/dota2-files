import { useMemo } from "react";
import { Download, FolderOpen } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { baseMap, imageUrl, isWholeMap, terrainMap } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { link } from "../lib/route.js";
import { Button, Card, GRID, LoadingList, Page, PageHead, Section } from "./ui.jsx";

const MAPS = datasetById("maps");
const fileName = (path) => path.slice(path.lastIndexOf("/") + 1);

// The game's map, whole, as glb: the one every match is played on, each terrain the game sells
// (the catalog's terrain items and the maps they name), then the other maps of the client. All from
// the maps dataset's list and the catalog, nothing named here
export default function MapPage({ catalog, indexes }) {
  const index = indexes.maps;
  const view = useMemo(() => {
    if (!catalog || !index) return null;
    const maps = new Map(index.entries.filter((e) => isWholeMap(e) && !e.copy).map((e) => [e.path, e]));
    const base = baseMap(catalog);
    // a terrain without a map of its own (the default one) wears the base map and stands first
    const shown = Object.entries(catalog.items)
      .filter(([, it]) => it.prefab === "terrain")
      .map(([id, it]) => ({ id, item: it, map: maps.get(terrainMap(it, catalog)) }))
      .filter((t) => t.map)
      .sort((a, b) => (b.map.path === base) - (a.map.path === base) || (a.item.date || "").localeCompare(b.item.date || ""));
    const used = new Set([base, ...shown.map((t) => t.map.path)]);
    const others = [...maps.values()].filter((e) => !used.has(e.path)).sort((a, b) => b.size - a.size);
    return { base: maps.get(base), terrains: shown, others };
  }, [catalog, index]);

  if (!view) return <LoadingList title="The map" grid={GRID.tile} ratio="aspect-video" count={12} />;
  const { base, terrains, others } = view;

  return (
    <Page className="min-h-[100svh]">
      <PageHead
        title="The map"
        sub="Dota 2's map, whole, as glb with its textures, lights and fog: the one every match is played on and every terrain the game sells. Each one is the full map, a few hundred MB."
        actions={
          base && (
            <>
              <Button as="a" primary size="lg" href={fileUrl(MAPS, base.path, true)}>
                <Download size={17} /> Download the map <span className="font-normal opacity-55">{formatSize(base.size)}</span>
              </Button>
              <Button as="a" size="lg" href={link("/maps/scenes")}>
                <FolderOpen size={17} /> Every scene
              </Button>
            </>
          )
        }
      />
      <div className="page-x space-y-14 pt-8 pb-24">
        {terrains.length > 0 && (
          <Section title="Terrains" count={terrains.length} sub="The map as each terrain dresses it. A card opens the terrain with every file it brings">
            <div className={GRID.tile}>
              {terrains.map((t) => (
                <TerrainCard key={t.id} id={t.id} item={t.item} map={t.map} />
              ))}
            </div>
          </Section>
        )}
        {others.length > 0 && (
          <Section title="Other maps" count={others.length} sub="The client's other maps: tutorials, the showcase and test maps">
            <ul className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900">
              {others.map((e) => (
                <li key={e.path} className="flex items-center gap-4 border-white/[0.05] px-4 py-2.5 not-first:border-t">
                  <span className="min-w-0 flex-1 truncate text-[0.92rem]">{fileName(e.path)}</span>
                  <span className="text-[0.84rem] text-ink-400 tabular-nums">{formatSize(e.size)}</span>
                  <Button as="a" size="sm" href={fileUrl(MAPS, e.path, true)} aria-label={`Download ${fileName(e.path)}`}>
                    <Download size={14} /> Download
                  </Button>
                </li>
              ))}
            </ul>
          </Section>
        )}
      </div>
    </Page>
  );
}

function TerrainCard({ id, item, map }) {
  return (
    <Card
      href={link(`/item/${id}`)}
      ratio="aspect-video"
      picture={item.icon && <img src={imageUrl(item.icon)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]" />}
      action={
        <button
          type="button"
          onClick={(e) => {
            // the card is a link: the button only downloads (the Hub answers with an attachment)
            e.preventDefault();
            e.stopPropagation();
            location.href = fileUrl(MAPS, map.path, true);
          }}
          title={`Download ${fileName(map.path)}`}
          aria-label={`Download ${fileName(map.path)}`}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/60 text-ink-100 backdrop-blur transition-colors hover:bg-black/80"
        >
          <Download size={16} />
        </button>
      }
      title={item.name}
      meta={`${fileName(map.path)} · ${formatSize(map.size)}`}
    />
  );
}
