import { lazy, Suspense, useMemo } from "react";
import { ExternalLink, FileArchive, LoaderCircle } from "lucide-react";
import { DATASETS, DOTADEX, datasetById } from "../datasets.js";
import { imageUrl, setDotadexPath, setFiles, setModels } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { link, openItem } from "../lib/route.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import SetCard from "./SetCard.jsx";
import { DetailTop, SideActions, SideBlock, SideTitle, Tag } from "./Detail.jsx";
import { heroIcon } from "./HeroPicker.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";
import { Button, Empty, GRID, Page, Section, Spinner, buttonClass, LoadingDetail } from "./ui.jsx";

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
  if (!catalog) return <LoadingDetail />;
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
      <DetailTop
        crumbs={hero ? [["/heroes", "Heroes"], [`/hero/${hero.key}`, hero.name], ["", set.name]] : [["/cosmetics", "Cosmetics"], ["/sets", "Sets"], ["", set.name]]}
        stage={
          <>
            {lookMode === "game" && dotadex ? (
              <GameStage path={dotadex} title={set.name} />
            ) : worn.length ? (
              <Suspense fallback={null}>
                <HeroViewer key={worn.map((e) => e.path).join("|")} models={worn} bare />
              </Suspense>
            ) : set.icon ? (
              <img src={imageUrl(set.icon)} alt="" className="mx-auto h-full object-contain" />
            ) : null}
            {dotadex && <LookSwitch look={lookMode} setLook={setLookMode} className="absolute top-2 right-0 sm:top-3" />}
          </>
        }
        left={
          <>
            <SideTitle
              title={set.name}
              icon={hero && <img src={heroIcon(hero)} alt="" className="h-8 w-8 shrink-0 rounded-lg" />}
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
            />
          </>
        }
      >
        <SideBlock title="In this set">
          <ul className="overflow-hidden rounded-xl border border-white/[0.07] bg-ink-900">
            {set.items.map((id) => {
              const it = catalog.items[id];
              return (
                <li key={id} className="border-white/[0.05] not-first:border-t">
                  <button onClick={() => openItem(id, set.items)} className="flex w-full items-center gap-3 px-2.5 py-2 text-left transition-colors hover:bg-white/[0.03]">
                    <span className="relative h-9 w-12 shrink-0 overflow-hidden rounded-md bg-ink-850">
                      {it.icon && <img src={imageUrl(it.icon)} alt="" loading="lazy" className="h-full w-full object-cover" />}
                      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: catalog.rarities[it.rarity || "common"]?.color || "transparent" }} />
                    </span>
                    <span className="min-w-0 flex-1 leading-tight">
                      <span className="block truncate text-[0.88rem]">{it.name}</span>
                      <span className="block truncate text-[0.76rem] text-ink-500">{it.slot || it.type}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </SideBlock>

        <SideActions
          main={
            ready ? (
              <Button primary size="lg" onClick={() => startJob("zip", asDownload, name)}>
                <FileArchive size={17} /> Download the set <span className="font-normal opacity-55">{formatSize(bytes)}</span>
              </Button>
            ) : (
              <span className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.06] text-[0.88rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )
          }
        >
          {dotadex && (
            <Button as="a" ghost href={`${DOTADEX}/${dotadex}`} target="_blank" rel="noreferrer" title="See the set on its hero in Dotadex">
              <ExternalLink size={16} /> Dotadex
            </Button>
          )}
          {dotadex && <EmbedButton path={dotadex} title={set.name} className={`${buttonClass({ ghost: true })} w-full`} />}
        </SideActions>
      </DetailTop>

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
