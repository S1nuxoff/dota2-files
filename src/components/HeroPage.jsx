import { lazy, Suspense, useMemo, useState } from "react";
import { Download, ExternalLink, FileArchive, FolderDown, LoaderCircle } from "lucide-react";
import { DATASETS, DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { attributeIcon, heroFiles, heroPortrait, imageUrl, prefabTitle } from "../lib/catalog.js";
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
import { Button, Chip, Empty, GRID, Page, Section, Segmented, Spinner, Toolbar, buttonClass, LoadingDetail, Progressive } from "./ui.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";
import { DetailTop, SideActions, SideBlock, SideTitle, StageBar, StageSwitch, Tag } from "./Detail.jsx";

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

  if (!catalog) return <LoadingDetail />;
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
      <DetailTop
        crumbs={[["/heroes", "Heroes"], ["", hero.name]]}
        stage={
          <>
            {lookMode === "game" ? (
              <GameStage path={`hero/${hero.key}${persona}`} title={look.name} />
            ) : modelEntry ? (
              <Suspense fallback={null}>
                <HeroViewer models={lookEntries} bare />
              </Suspense>
            ) : (
              <img src={heroPortrait(hero)} alt="" className="h-full w-full object-cover opacity-70" />
            )}
            <LookSwitch look={lookMode} setLook={setLookMode} className="absolute top-2 right-0 sm:top-3" />
            {looks.length > 1 && (
              <StageBar className="bottom-1 sm:bottom-2">
                <StageSwitch items={looks.map((l) => [l.id, l.name])} value={look.id} onChange={setLook} />
              </StageBar>
            )}
          </>
        }
        left={
          <>
            <SideTitle
              title={hero.name}
              icon={
                about?.attribute && (
                  <span className="flex items-center gap-2 text-[0.86rem] text-ink-300">
                    <img src={attributeIcon(about.attribute)} alt="" className="h-6 w-6" /> {about.attribute}
                    {about.attack && <span className="text-ink-500">· {about.attack}</span>}
                  </span>
                )
              }
              line={`${formatCount(items.length)} items, ${hero.sets.length} sets${ready ? `, ${formatCount(files.length)} files` : ""}`}
              tags={about && about.roles.map(([r]) => <Tag key={r}>{r}</Tag>)}
            />
            {about?.hype && (
              <p className="max-w-lg text-[1rem] leading-relaxed text-ink-300 [text-shadow:0_1px_12px_rgb(0_0_0/0.8)]">
                <span className="line-clamp-5">{about.hype}</span>
                <button onClick={() => setTab("about")} className="mt-2 text-[0.86rem] text-ink-100 underline decoration-white/25 underline-offset-4 hover:decoration-white">
                  Story, numbers and abilities
                </button>
              </p>
            )}
          </>
        }
      >
        {about?.stats && (
          <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.06]">
            {[
              ["strength", "Strength"],
              ["agility", "Agility"],
              ["intelligence", "Intelligence"],
            ].map(([k, label]) => {
              const v = about.stats[k];
              return (
                <div key={k} className="bg-ink-900 px-3 py-2.5">
                  <dt className="flex items-center gap-1.5 text-[0.74rem] text-ink-500">
                    <img src={attributeIcon(label)} alt="" className="h-3.5 w-3.5" /> {label}
                  </dt>
                  <dd className="mt-1 text-[1rem] font-medium tabular-nums">
                    {Array.isArray(v) ? v[0] : v} {Array.isArray(v) && <span className="text-[0.78rem] font-normal text-ink-400">+{v[1]}</span>}
                  </dd>
                </div>
              );
            })}
          </dl>
        )}

        {about?.abilities?.length > 0 && (
          <SideBlock title="Abilities">
            <div className="flex flex-wrap gap-1.5">
              {about.abilities
                .filter((a) => a.icon)
                .map((a) => (
                  <button key={a.id} onClick={() => setTab("about")} title={a.name} className="overflow-hidden rounded-lg border border-white/[0.07] transition-transform hover:-translate-y-0.5 hover:border-white/25">
                    <img src={imageUrl(a.icon)} alt={a.name} loading="lazy" className="h-11 w-11" />
                  </button>
                ))}
            </div>
          </SideBlock>
        )}


        <SideActions
          main={
            ready ? (
              <Button primary size="lg" onClick={() => startJob("zip", asDownload(files), hero.key)} title="Models, items, sounds, effects, pictures">
                <FileArchive size={17} /> Download everything <span className="font-normal opacity-55">{bytes(files)}</span>
              </Button>
            ) : (
              <span className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.06] text-[0.88rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )
          }
        >
          {lookEntries.length > 1 && (
            <Button
              onClick={() => startJob("zip", lookEntries.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: e.name })), `${look.id.replace("npc_dota_hero_", "")}-look`)}
              title={`${lookEntries.length} models as you see them`}
            >
              <Download size={16} /> Default look <span className="font-normal text-ink-400">{bytes(lookEntries)}</span>
            </Button>
          )}
          {modelEntry && (
            <Button as="a" href={fileUrl(datasetById("models"), modelEntry.path, true)} title={`${modelEntry.name}, ${formatSize(modelEntry.size)}`}>
              <Download size={16} /> Body <span className="font-normal text-ink-400">{formatSize(modelEntry.size)}</span>
            </Button>
          )}
          <Button as="a" ghost href={`${DOTADEX}/hero/${hero.key}${persona}`} target="_blank" rel="noreferrer" title="See the hero in Dotadex, as the game shows it">
            <ExternalLink size={16} /> Dotadex
          </Button>
          <EmbedButton path={`hero/${hero.key}${persona}`} title={look.name} className={`${buttonClass({ ghost: true })} w-full`} />
        </SideActions>
      </DetailTop>

      <Toolbar className="py-0" gap={false}>
        <Segmented variant="line" label="Parts of the hero" value={tab} onChange={setTab} items={tabs} className="border-b-0" />
        {tab !== "items" && tab !== "about" && byDataset[tab] && (
          <div className="py-2 max-sm:w-full">
            <DownloadButtons entries={byDataset[tab]} title={`${hero.key}-${tab}`} />
          </div>
        )}
      </Toolbar>

      <div className="page-x pt-8">
        {tab === "items" ? (
          <div key={`items-${grouping}`} className="anim-page space-y-12">
            <div className="flex flex-col items-center gap-3">
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
                <div className="flex flex-wrap justify-center gap-1.5">
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
                <Section title="Sets" count={hero.sets.length} center>
                  <Progressive items={hero.sets} step={24} className={GRID.tall} render={(set, i) => <SetCard key={set.key} set={set} delay={Math.min(i % 24, 24) * 20} />} />
                </Section>
                {loose.length > 0 && (
                  <Section title="Not in a set" count={loose.length} center>
                    <Progressive items={loose} step={36} className={GRID.item} render={(item, i) => <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i % 36, 24) * 20} list={loose.map((x) => x.id)} />} />
                  </Section>
                )}
              </>
            ) : (
              <Progressive items={shown} step={36} className={GRID.item} render={(item, i) => <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i % 36, 24) * 20} list={shown.map((x) => x.id)} />} />
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
