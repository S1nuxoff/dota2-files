import { lazy, Suspense, useMemo } from "react";
import { ExternalLink, FileArchive, LoaderCircle } from "lucide-react";
import { DATASETS, DOTADEX, datasetById } from "../datasets.js";
import { imageUrl, setDotadexPath, setFiles, setModels } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { link } from "../lib/route.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import SetCard from "./SetCard.jsx";
import { DetailHead, Stage, Tag } from "./Detail.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";
import { Button, Empty, GRID, Page, Section, Spinner, buttonClass } from "./ui.jsx";

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
  if (!set) return <Page><Empty title={`There is no set ${setKey}`} action={<Button as="a" href={link("/sets")}>All sets</Button>} /></Page>;

  const hero = set.hero;
  const dotadex = setDotadexPath(set, catalog);
  const order = Object.fromEntries(DATASETS.map((d, i) => [d.id, i]));
  const sorted = [...files].sort((a, b) => order[a.ds] - order[b.ds] || a.path.localeCompare(b.path));
  const bytes = files.reduce((n, e) => n + e.size, 0);
  const name = set.name.replace(/[\\/:*?"<>|]/g, "");
  const asDownload = files.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));
  const rarities = [...new Set(set.items.map((id) => catalog.items[id]?.rarity).filter(Boolean))];

  return (
    <Page>
      <DetailHead
        crumbs={hero ? [["/heroes", "Heroes"], [`/hero/${hero.key}`, hero.name], ["", set.name]] : [["/cosmetics", "Cosmetics"], ["/sets", "Sets"], ["", set.name]]}
        title={set.name}
        line={
          <>
            Set of {set.items.length} items{hero && <> for <a href={link(`/hero/${hero.key}`)} className="text-ink-200 hover:underline">{hero.name}</a></>}
            {ready && `, ${files.length} files`}
          </>
        }
        tags={rarities.map((r) => (
          <Tag key={r} color={catalog.rarities[r]?.color}>
            {catalog.rarities[r]?.name || r}
          </Tag>
        ))}
        actions={
          <>
            {ready ? (
              <Button primary onClick={() => startJob("zip", asDownload, name)}>
                <FileArchive size={16} /> Download the set <span className="font-normal opacity-55">{formatSize(bytes)}</span>
              </Button>
            ) : (
              <span className="flex h-10 items-center justify-center gap-2 px-4 text-[0.86rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )}
            {dotadex && (
              <Button as="a" ghost href={`${DOTADEX}/${dotadex}`} target="_blank" rel="noreferrer" title="See the set on its hero in Dotadex">
                <ExternalLink size={16} /> Dotadex
              </Button>
            )}
            {dotadex && <EmbedButton path={dotadex} title={set.name} className={`${buttonClass({ ghost: true })} w-full`} />}
          </>
        }
      >
        <Stage>
          {lookMode === "game" && dotadex ? (
            <GameStage path={dotadex} title={set.name} />
          ) : worn.length ? (
            <Suspense fallback={null}>
              <HeroViewer key={worn.map((e) => e.path).join("|")} models={worn} bare />
            </Suspense>
          ) : set.icon ? (
            <img src={imageUrl(set.icon)} alt="" className="mx-auto h-full object-contain" />
          ) : null}
          {dotadex && <LookSwitch look={lookMode} setLook={setLookMode} className="absolute top-3 right-3 sm:top-5 sm:right-5" />}
        </Stage>
      </DetailHead>

      <div className="page-x mt-12 space-y-14">
        <Section title="In this set" count={set.items.length}>
          <div className={GRID.item}>
            {set.items.map((id, i) => (
              <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={i * 25} list={set.items} />
            ))}
          </div>
        </Section>

        {hero && hero.sets.length > 1 && (
          <Section title={`More sets for ${hero.name}`} count={hero.sets.length - 1} actions={<Button as="a" ghost size="sm" href={link(`/hero/${hero.key}`)}>All of {hero.name}</Button>}>
            <div className="no-bar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 sm:gap-4">
              {hero.sets
                .filter((s) => s.key !== set.key)
                .slice(0, 16)
                .map((s) => (
                  <div key={s.key} className="w-36 shrink-0 sm:w-44">
                    <SetCard set={s} />
                  </div>
                ))}
            </div>
          </Section>
        )}

        <Section title="Every file" count={files.length} sub="Models, textures, icons and effects of its items">
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-1.5 sm:p-2">
            <FileTable entries={sorted} route={route} height={`${Math.min(36, Math.max(1, sorted.length) * 2.75 + 0.5)}rem`} />
          </div>
        </Section>
      </div>
    </Page>
  );
}
