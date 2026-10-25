import { lazy, Suspense, useMemo, useState } from "react";
import { Download, FileArchive, Image as ImageIcon, LoaderCircle, Package } from "lucide-react";
import { DATASETS, DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { imageUrl, itemDotadexPath, itemFiles, prefabTitle } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import FileTable, { Row } from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import Loot from "./Loot.jsx";
import { eventKind } from "./CosmeticsPage.jsx";
import SoundList from "./SoundList.jsx";
import { link, navigate, openItem } from "../lib/route.js";
import { Button, Empty, GRID, Page, Section, Spinner, buttonClass, LoadingDetail } from "./ui.jsx";
import EmbedButton from "./EmbedButton.jsx";
import GameStage, { LookSwitch, useLook } from "./GameStage.jsx";
import { DetailTop, IconRow, SideActions, SideBlock, SideTitle, StyleSwitch, Tag, DotadexCard } from "./Detail.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// axe_body_color_psd_dc021791.png -> axe body color
export const textureLabel = (path) =>
  path
    .split("/")
    .pop()
    .replace(/\.(png|exr)$/, "")
    .replace(/_[0-9a-f]{6,8}$/, "")
    .replace(/_(psd|tga|png|jpg|vmat_g_\w+)$/, "")
    .replace(/_/g, " ");

// An item's own page (its address opened directly): the item on a stage, its name, what it is and
// its downloads under it; then the rest of its set, what drops from it, its pictures, effects,
// sounds, textures and every file
export default function ItemPage({ itemId, catalog, indexes, withCopies, route }) {
  const item = catalog?.items[itemId];
  const files = useMemo(() => (item ? itemFiles(item, catalog, indexes, withCopies) : []), [item, catalog, indexes, withCopies]);
  const ready = item && Object.keys(item.refs).every((ds) => indexes[ds]);
  const [style, setStyle] = useState(0);
  const [shown, setShown] = useLook();
  if (!catalog) return <LoadingDetail />;
  if (!item) return <Page><Empty title={`There is no item ${itemId}`} action={<Button as="a" href={link("/cosmetics")}>All cosmetics</Button>} /></Page>;

  const rarity = catalog.rarities[item.rarity || "common"];
  const heroes = item.heroes.map((id) => catalog.heroById.get(id)).filter(Boolean);
  const set = item.set && catalog.sets[item.set];
  const models = files.filter((e) => e.ext === "glb");
  const model = models[Math.min(style, models.length - 1)];
  const textures = files.filter((e) => e.ds === "textures");
  const sounds = files.filter((e) => e.ds === "sounds");
  // An item that is only an effect (ambient effects, a courier's): seen in the game's look, on its hero
  const effectOnly = !files.some((e) => e.ext === "glb") && files.some((e) => e.ds === "particles");
  // The item's pictures but its icon (a loading screen, a HUD's art, cursors), the largest on the stage
  const pictures = files.filter((e) => e.kind === "image" && e.ds !== "textures" && e.path !== item?.icon);
  const poster = pictures.reduce((best, e) => (!best || e.size > best.size ? e : best), null);
  const effects = files.filter((e) => e.ds === "particles");
  const order = Object.fromEntries(DATASETS.map((d, i) => [d.id, i]));
  const sorted = [...files].sort((a, b) => order[a.ds] - order[b.ds] || a.path.localeCompare(b.path));
  const others = set ? set.items.filter((id) => id !== item.id && catalog.items[id]) : [];
  const name = item.name.replace(/[\\/:*?"<>|]/g, "");
  const bytes = files.reduce((n, e) => n + e.size, 0);
  const asDownload = files.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));
  const kind = item.type || prefabTitle(item.prefab);
  const crumbs = heroes[0]
    ? [["/heroes", "Heroes"], [`/hero/${heroes[0].key}`, heroes[0].name], ["", item.name]]
    : [["/cosmetics", "Cosmetics"], [`/cosmetics/${item.prefab}`, prefabTitle(item.prefab)], ["", item.name]];

  return (
    <Page>
      <DetailTop
        crumbs={crumbs}
        stage={
          <>
            {(shown === "game" && models.length > 0) || effectOnly ? (
              <GameStage path={itemDotadexPath(item, catalog)} title={item.name} />
            ) : model ? (
              <Suspense fallback={null}>
                <HeroViewer key={item.bundle ? item.id : model.path} models={item.bundle ? models : [model]} bare />
              </Suspense>
            ) : (
              <div className="flex h-full items-center justify-center p-6">
                {poster ? (
                  <img src={fileUrl(datasetById(poster.ds), poster.path)} alt={item.name} className="max-h-[86%] max-w-[92%] rounded-xl object-contain shadow-2xl" />
                ) : item.icon ? (
                  <img src={imageUrl(item.icon)} alt={item.name} className="max-h-[55%] max-w-[70%] rounded-2xl object-contain shadow-2xl" />
                ) : (
                  <Package size={52} strokeWidth={1} className="text-ink-600" />
                )}
              </div>
            )}
            {models.length > 0 && <LookSwitch look={shown} setLook={setShown} className="absolute top-2 right-0 sm:top-3" />}
            {shown === "simple" && models.length > 1 && !item.bundle && <StyleSwitch models={models} value={Math.min(style, models.length - 1)} onChange={setStyle} />}
          </>
        }
        left={
          <>
            <SideTitle
              title={item.name}
              icon={item.icon && <img src={imageUrl(item.icon)} alt="" className="h-14 w-auto shrink-0 rounded-xl border border-white/[0.06]" />}
              line={[kind, item.slot, heroes.length ? `for ${heroes.map((h) => h.name).join(", ")}` : ""].filter(Boolean).join(" · ")}
              tags={
                <>
                  {rarity && <Tag color={rarity.color}>{rarity.name}</Tag>}
                  {item.date && <Tag>{item.date.slice(0, 4)}</Tag>}
                  {item.event && catalog.events?.[item.event] && <Tag href={link(`/cosmetics/${eventKind(item.event)}`)}>{catalog.events[item.event]}</Tag>}
                  {heroes.map((h) => (
                    <Tag key={h.id} href={link(`/hero/${h.key}`)}>
                      {h.name}
                    </Tag>
                  ))}
                </>
              }
            />
            {item.text && <p className="line-clamp-6 max-w-lg [text-shadow:0_1px_12px_rgb(0_0_0/0.8)] text-[0.95rem] leading-relaxed whitespace-pre-line text-ink-300">{item.text}</p>}
          </>
        }
      >
        {others.length > 0 && (
          <SideBlock
            title={set.name}
            action={
              <a href={link(`/set/${item.set}`)} className="text-[0.8rem] text-ink-300 hover:text-ink-100">
                The whole set
              </a>
            }
          >
            <IconRow items={others.map((id) => catalog.items[id])} rarities={catalog.rarities} onOpen={(id) => openItem(id, others)} />
          </SideBlock>
        )}

        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.06] text-[0.8rem]">
          {[
            ["Files", files.length],
            ["Models", models.length],
            ["Textures", textures.length],
          ].map(([label, v]) => (
            <div key={label} className="bg-ink-900 px-3 py-2.5">
              <dt className="text-ink-500">{label}</dt>
              <dd className="mt-0.5 text-[1rem] font-medium tabular-nums">{ready ? v : "…"}</dd>
            </div>
          ))}
        </dl>

        <SideActions
          main={
            ready ? (
              <Button primary size="lg" onClick={() => startJob("zip", asDownload, name)}>
                <FileArchive size={17} /> Download all <span className="font-normal opacity-55">{formatSize(bytes)}</span>
              </Button>
            ) : (
              <span className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.06] text-[0.88rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )
          }
        >
          {model && (
            <Button as="a" href={fileUrl(datasetById("models"), model.path, true)} className="col-span-2">
              <Download size={16} /> Model glb <span className="font-normal text-ink-400">{formatSize(model.size)}</span>
            </Button>
          )}
        </SideActions>
        <DotadexCard href={`${DOTADEX}/item/${item.id}`} name="it" embed={<EmbedButton path={`item/${item.id}`} title={item.name} className={buttonClass({ ghost: true, size: "sm" })} />} />
      </DetailTop>

      <div className="page-x mt-12 space-y-14">
        {others.length > 0 && (
          <Section
            title={set.name}
            sub="The rest of its set"
            actions={
              <Button as="a" ghost size="sm" href={link(`/set/${item.set}`)}>
                Open the whole set
              </Button>
            }
          >
            <div className={GRID.item}>
              {others.map((id, i) => (
                <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={i * 25} list={others} />
              ))}
            </div>
          </Section>
        )}

        <Loot item={item} catalog={catalog} />

        {pictures.length > 1 && (
          <Section title="Pictures" count={pictures.length} sub="Click one to download it">
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))] sm:gap-3">
              {pictures.map((e) => (
                <a key={e.path} href={fileUrl(datasetById(e.ds), e.path, true)} title={`Download ${e.name}`} className="checker flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-white/[0.06] transition-colors hover:border-white/20">
                  <img src={fileUrl(datasetById(e.ds), e.path)} alt="" loading="lazy" className="h-full w-full object-contain" />
                </a>
              ))}
            </div>
          </Section>
        )}

        {effects.length > 0 && (
          <Section title="Effects" count={effects.length} sub="The particle systems it plays, as the game describes them">
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-1.5 sm:p-2">
              {effects.map((e) => (
                <Row key={e.path} e={e} active={route.file === `${e.ds}:${e.path}`} onOpen={() => navigate({ ...route, file: `${e.ds}:${e.path}` })} />
              ))}
            </div>
          </Section>
        )}

        {sounds.length > 0 && <SoundList files={sounds} route={route} />}

        {textures.length > 0 && (
          <Section title="Textures" count={textures.length} sub="Click one to download it">
            <div className={GRID.small}>
              {textures.map((t, i) => (
                <a
                  key={t.path}
                  href={fileUrl(datasetById("textures"), t.path, true)}
                  title={`Download ${t.name}`}
                  style={{ animationDelay: `${i * 25}ms` }}
                  className="anim-card group overflow-hidden rounded-xl border border-white/[0.06] bg-ink-900 transition-colors hover:border-white/[0.16]"
                >
                  <div className="checker relative flex aspect-square items-center justify-center">
                    {t.ext === "png" ? <img src={fileUrl(datasetById("textures"), t.path)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <ImageIcon size={24} className="text-ink-600" />}
                    <span className="absolute right-2 bottom-2 flex h-8 w-8 items-center justify-center rounded-lg bg-black/60 opacity-0 transition-opacity group-hover:opacity-100">
                      <Download size={14} />
                    </span>
                  </div>
                  <div className="px-2.5 py-2 leading-tight sm:px-3 sm:py-2.5">
                    <div className="truncate text-[0.82rem] capitalize">{textureLabel(t.path)}</div>
                    <div className="mt-0.5 text-[0.72rem] text-ink-400">{formatSize(t.size)}</div>
                  </div>
                </a>
              ))}
            </div>
          </Section>
        )}

        <Section title="Every file" count={files.length} sub={`Model, textures, icon${item.refs.particles ? ", effects" : ""}${item.refs.sounds ? ", sounds" : ""}`}>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-1.5 sm:p-2">
            <FileTable entries={sorted} route={route} height={`${Math.min(32, Math.max(1, sorted.length) * 2.75 + 0.5)}rem`} />
          </div>
        </Section>
      </div>
    </Page>
  );
}
