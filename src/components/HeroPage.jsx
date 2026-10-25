import { lazy, Suspense, useMemo, useState } from "react";
import { Download, ExternalLink, FileArchive, FolderDown, LoaderCircle } from "lucide-react";
import { DATASETS, DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { attributeIcon, heroFiles, heroPortrait, prefabTitle } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";
import ItemCard from "./ItemCard.jsx";
import SetCard from "./SetCard.jsx";
import ModelGrid from "./ModelGrid.jsx";
import SoundList from "./SoundList.jsx";
import ImageGroups from "./ImageGroups.jsx";
import GroupedFiles from "./GroupedFiles.jsx";
import HeroAbout from "./HeroAbout.jsx";
import { link, navigate } from "../lib/route.js";
import { Button, Chip, Empty, GRID, Page, Section, Segmented, Spinner, Toolbar, buttonClass } from "./ui.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";
import { DetailHead, Stage, StageBar, StageSwitch, Tag } from "./Detail.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// Files of several datasets as a download: <dataset repo>/<path>
const asDownload = (entries) => entries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));

export function DownloadButtons({ entries, title }) {
  const bytes = entries.reduce((s, e) => s + e.size, 0);
  return (
    <div className="flex items-center gap-2">
      <Button primary size="sm" onClick={() => startJob("zip", asDownload(entries), title)}>
        <FileArchive size={15} /> Download all <span className="font-normal opacity-55">{formatSize(bytes)}</span>
      </Button>
      {canSaveToFolder() && (
        <Button size="sm" onClick={() => startJob("folder", asDownload(entries), title)} title="Save every file into a folder on your disk">
          <FolderDown size={15} /> <span className="max-sm:hidden">To a folder</span>
        </Button>
      )}
    </div>
  );
}

// A hero: its model on the stage (each persona, the game's look or this site's), its name and
// downloads under it, then its items, its story and abilities, and every file of it by dataset
export default function HeroPage({ heroKey, catalog, indexes, withCopies, route }) {
  const hero = catalog?.heroByKey.get(heroKey);
  const loaded = DATASETS.filter((d) => indexes[d.id]).length;
  const ready = loaded === DATASETS.length;
  const [slot, setSlot] = useState("");
  const [grouping, setGrouping] = useState("sets");

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
  const [lookMode, setLookMode] = useLook();
  const look = looks.find((l) => l.id === lookId) || looks[0];
  const lookEntries = useMemo(() => {
    if (!look?.model || !indexes.models) return [];
    const byPath = new Map(indexes.models.entries.map((e) => [e.path, e]));
    return [look.model, ...(look.look || [])].map((p) => byPath.get(p)).filter(Boolean);
  }, [look, indexes.models]);
  const modelEntry = lookEntries[0];

  const tab = route.kind && (route.kind === "items" || route.kind === "about" || byDataset[route.kind]) ? route.kind : "items";
  const setTab = (t) => navigate({ ds: "hero", dir: heroKey, kind: t === "items" ? "" : t }, true);

  if (!catalog) return <Spinner text="Loading the catalog" />;
  if (!hero) return <Page><Empty title={`There is no hero called ${heroKey}`} action={<Button as="a" href={link("/heroes")}>All heroes</Button>} /></Page>;

  const shown = slot ? items.filter((i) => (i.slot || i.prefab) === slot) : items;
  // The hero's items that no set of it holds
  const inSets = new Set(hero.sets.flatMap((s) => s.items));
  const loose = items.filter((i) => !inSets.has(i.id));
  const tabs = [["items", "Items", items.length], ...(hero.about ? [["about", "About", null]] : []), ...DATASETS.filter((d) => byDataset[d.id]).map((d) => [d.id, d.title, byDataset[d.id].length])];
  const bytes = (list) => formatSize(list.reduce((n, e) => n + e.size, 0));
  const persona = looks.indexOf(look) > 0 ? `?persona=${looks.indexOf(look)}` : "";
  const about = hero.about;

  return (
    <Page>
      <DetailHead
        crumbs={[["/heroes", "Heroes"], ["", hero.name]]}
        title={hero.name}
        icon={about?.attribute && <img src={attributeIcon(about.attribute)} alt={about.attribute} title={about.attribute} className="mt-1.5 h-8 w-8 shrink-0 sm:mt-2.5 sm:h-9 sm:w-9" />}
        line={
          <>
            {formatCount(items.length)} items, {hero.sets.length} sets{ready ? `, ${formatCount(files.length)} files` : ""}
          </>
        }
        tags={about && [about.attribute, about.attack, ...about.roles.map(([r]) => r)].filter(Boolean).map((t) => <Tag key={t}>{t}</Tag>)}
        actions={
          <>
            {ready ? (
              <Button primary onClick={() => startJob("zip", asDownload(files), hero.key)} title="Models, items, sounds, effects, pictures">
                <FileArchive size={16} /> Download everything <span className="font-normal opacity-55">{bytes(files)}</span>
              </Button>
            ) : (
              <span className="flex h-10 items-center justify-center gap-2 px-4 text-[0.86rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )}
            {lookEntries.length > 1 && (
              <Button
                onClick={() => startJob("zip", lookEntries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: e.name })), `${look.id.replace("npc_dota_hero_", "")}-look`)}
                title={`${lookEntries.length} models as you see them`}
              >
                <Download size={16} /> Default look <span className="font-normal text-ink-400 max-sm:hidden">{bytes(lookEntries)}</span>
              </Button>
            )}
            {modelEntry && (
              <Button as="a" href={fileUrl(datasetById("models"), modelEntry.path, true)} title={`${modelEntry.name}, ${formatSize(modelEntry.size)}`}>
                <Download size={16} /> Body <span className="font-normal text-ink-400 max-sm:hidden">{formatSize(modelEntry.size)}</span>
              </Button>
            )}
            <Button as="a" ghost href={`${DOTADEX}/hero/${hero.key}${persona}`} target="_blank" rel="noreferrer" title="See the hero in Dotadex, as the game shows it">
              <ExternalLink size={16} /> Dotadex
            </Button>
            <EmbedButton path={`hero/${hero.key}${persona}`} title={look.name} className={`${buttonClass({ ghost: true })} w-full`} />
          </>
        }
      >
        <Stage>
          {lookMode === "game" ? (
            <GameStage path={`hero/${hero.key}${persona}`} title={look.name} />
          ) : modelEntry ? (
            <Suspense fallback={null}>
              <HeroViewer models={lookEntries} bare />
            </Suspense>
          ) : (
            <img src={heroPortrait(hero)} alt="" className="h-full w-full object-cover opacity-70" />
          )}
          <LookSwitch look={lookMode} setLook={setLookMode} className="absolute top-3 right-3 sm:top-5 sm:right-5" />
          {looks.length > 1 && (
            <StageBar>
              <StageSwitch items={looks.map((l) => [l.id, l.name])} value={look.id} onChange={setLook} />
            </StageBar>
          )}
        </Stage>
      </DetailHead>

      <Toolbar className="py-0">
        <Segmented variant="line" label="Parts of the hero" value={tab} onChange={setTab} items={tabs} className="min-w-0 flex-1 border-b-0" />
        {tab !== "items" && tab !== "about" && byDataset[tab] && (
          <div className="py-2 max-sm:w-full">
            <DownloadButtons entries={byDataset[tab]} title={`${hero.key}-${tab}`} />
          </div>
        )}
      </Toolbar>

      <div className="page-x pt-6">
        {tab === "items" ? (
          <div key={`items-${grouping}`} className="anim-page space-y-12">
            <div className="flex flex-wrap items-center gap-2">
              <Segmented
                label="Group items"
                value={grouping}
                onChange={setGrouping}
                items={[
                  ["sets", "By set"],
                  ["slots", "By slot"],
                ]}
              />
              {grouping === "slots" && (
                <div className="no-bar -mx-1 flex gap-1.5 overflow-x-auto px-1 max-sm:w-full">
                  {["", ...slots].map((s) => (
                    <Chip key={s} active={slot === s} onClick={() => setSlot(s)}>
                      {s ? prefabTitleOr(s) : "All"}
                    </Chip>
                  ))}
                </div>
              )}
            </div>
            {grouping === "sets" ? (
              <>
                <Section title="Sets" count={hero.sets.length}>
                  <div className={GRID.tall}>
                    {hero.sets.map((set, i) => (
                      <SetCard key={set.key} set={set} delay={Math.min(i, 24) * 20} />
                    ))}
                  </div>
                </Section>
                {loose.length > 0 && (
                  <Section title="Not in a set" count={loose.length}>
                    <div className={GRID.item}>
                      {loose.map((item, i) => (
                        <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 24) * 20} list={loose.map((x) => x.id)} />
                      ))}
                    </div>
                  </Section>
                )}
              </>
            ) : (
              <div className={GRID.item}>
                {shown.map((item, i) => (
                  <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 24) * 20} list={shown.map((x) => x.id)} />
                ))}
              </div>
            )}
          </div>
        ) : (
          <div key={tab} className="anim-page">
            {tab === "about" ? (
              <HeroAbout about={hero.about} hero={hero} catalog={catalog} sounds={byDataset.sounds || []} particles={byDataset.particles || []} route={route} />
            ) : tab === "images" ? (
              <ImageGroups files={byDataset.images || []} route={route} />
            ) : tab === "sounds" ? (
              <SoundList files={byDataset.sounds || []} route={route} />
            ) : tab === "models" ? (
              <ModelGrid files={byDataset.models || []} catalog={catalog} indexes={indexes} heroName={hero.name} route={route} />
            ) : (
              <GroupedFiles files={byDataset[tab] || []} hero={hero} catalog={catalog} grid={tab === "textures"} route={route} />
            )}
          </div>
        )}
      </div>
    </Page>
  );
}

export function Loading({ text }) {
  return <Spinner text={text} />;
}
