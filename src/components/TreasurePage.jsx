import { lazy, Suspense, useMemo } from "react";
import { Download, FileArchive, LoaderCircle, Package } from "lucide-react";
import { DOTADEX, datasetById } from "../datasets.js";
import { imageUrl, itemFiles, prefabTitle } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { link } from "../lib/route.js";
import FileTable from "./FileTable.jsx";
import ItemCard from "./ItemCard.jsx";
import { eventKind } from "./CosmeticsPage.jsx";
import { DetailTop, DotadexCard, SideActions, SideTitle, Tag } from "./Detail.jsx";
import { Button, GRID, Page, Progressive, Section } from "./ui.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// The kinds of item that open into others: treasure chests (open and retired) and sticker capsules
const KINDS = new Set(["treasure_chest", "retired_treasure_chest", "sticker_capsule"]);
export const isTreasure = (item) => !!item?.loot && KINDS.has(item.prefab);

// The chance a treasure shows its extras with (treasure_rarity_override), in words
const BONUS = { rare: "Rare bonus", very_rare: "Very rare bonus", ultra_rare: "Ultra rare bonus", cosmically_rare: "Cosmically rare bonus" };
const BONUS_ORDER = ["rare", "very_rare", "ultra_rare", "cosmically_rare"];

// A treasure or a capsule on a page of its own: its picture (its model, for the capsules that have
// one), its event, and what it gives, rarest first, with every file of all of it in one download;
// then the extras it may add and the other treasures of its event
export default function TreasurePage({ item, catalog, indexes, withCopies, route }) {
  const known = (id) => catalog.items[id];
  const drops = useMemo(() => item.loot.drops.filter(known), [item, catalog]); // eslint-disable-line react-hooks/exhaustive-deps
  const bonus = useMemo(() => item.loot.bonus.filter(([id]) => known(id)), [item, catalog]); // eslint-disable-line react-hooks/exhaustive-deps
  const ready = Object.keys(item.refs).every((ds) => indexes[ds]);

  // Its own files and those of everything it gives, once each
  const own = useMemo(() => itemFiles(item, catalog, indexes, withCopies), [item, catalog, indexes, withCopies]);
  const inside = useMemo(() => {
    const out = new Map();
    for (const id of [...drops, ...bonus.map(([b]) => b)]) for (const e of itemFiles(catalog.items[id], catalog, indexes, withCopies)) out.set(`${e.ds}:${e.path}`, e);
    return [...out.values()];
  }, [drops, bonus, catalog, indexes, withCopies]);
  const bytes = inside.reduce((n, e) => n + e.size, 0);
  const name = item.name.replace(/[\\/:*?"<>|]/g, "");
  const asDownload = (files) => files.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: `${datasetById(e.ds).repo}/${e.path}` }));

  // What it gives by rarity, the rarest first; the ones without one (stickers) together at the end
  const groups = useMemo(() => {
    const by = new Map();
    for (const id of drops) {
      const r = catalog.items[id].rarity || "";
      (by.get(r) || by.set(r, []).get(r)).push(id);
    }
    const order = (r) => catalog.rarities[r]?.order ?? -1;
    return [...by].sort((a, b) => order(b[0]) - order(a[0]));
  }, [drops, catalog]);
  const extras = useMemo(() => {
    const by = new Map();
    for (const [id, r] of bonus) (by.get(r) || by.set(r, []).get(r)).push(id);
    return [...by].sort((a, b) => BONUS_ORDER.indexOf(a[0]) - BONUS_ORDER.indexOf(b[0]));
  }, [bonus]);
  // The other treasures and capsules of its event, the newest first
  const siblings = useMemo(
    () =>
      item.event
        ? Object.entries(catalog.items)
            .filter(([id, it]) => id !== item.id && it.event === item.event && isTreasure(it))
            .sort((a, b) => (b[1].date || "").localeCompare(a[1].date || ""))
            .map(([id]) => id)
        : [],
    [item, catalog]
  );

  const model = own.find((e) => e.ext === "glb");
  const event = item.event && catalog.events?.[item.event];
  const kind = item.prefab === "sticker_capsule" ? "Sticker capsule" : item.prefab === "retired_treasure_chest" ? "Retired treasure" : "Treasure";
  const rarity = catalog.rarities[item.rarity];
  const everyone = drops.every((id) => catalog.items[id].prefab === "sticker");
  const crumbs = [["/cosmetics", "Cosmetics"], ["/cosmetics/treasures", "Treasures"], ["", item.name]];

  return (
    <Page>
      <DetailTop
        crumbs={crumbs}
        stage={
          model ? (
            <Suspense fallback={null}>
              <HeroViewer key={model.path} models={[model]} bare />
            </Suspense>
          ) : (
            <div className="flex h-full items-center justify-center p-6">
              {item.icon ? (
                <img src={imageUrl(item.icon)} alt={item.name} className="max-h-[78%] max-w-[86%] object-contain drop-shadow-[0_30px_60px_rgba(0,0,0,0.7)]" />
              ) : (
                <Package size={60} strokeWidth={1} className="text-ink-600" />
              )}
            </div>
          )
        }
        left={
          <>
            <SideTitle
              title={item.name}
              line={[kind, event].filter(Boolean).join(" · ")}
              tags={
                <>
                  {rarity && <Tag color={rarity.color}>{rarity.name}</Tag>}
                  {item.date && <Tag>{item.date}</Tag>}
                  {event && <Tag href={link(`/cosmetics/${eventKind(item.event)}`)}>{event}</Tag>}
                </>
              }
            />
            {item.text && <p className="line-clamp-6 max-w-lg text-[0.95rem] leading-relaxed whitespace-pre-line text-ink-300 [text-shadow:0_1px_12px_rgb(0_0_0/0.8)]">{item.text}</p>}
          </>
        }
      >
        <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-xl border border-white/[0.07] bg-white/[0.06] text-[0.8rem]">
          {[
            ["Inside", drops.length],
            ["Bonus", bonus.length],
            ["Files", ready ? inside.length : null],
          ].map(([label, v]) => (
            <div key={label} className="bg-ink-900 px-3 py-2.5">
              <dt className="text-ink-500">{label}</dt>
              <dd className="mt-0.5 text-[1rem] font-medium tabular-nums">{v == null ? "…" : formatCount(v)}</dd>
            </div>
          ))}
        </dl>
        <SideActions
          main={
            ready ? (
              <Button primary size="lg" onClick={() => startJob("zip", asDownload(inside), `${name} - contents`)} disabled={!inside.length}>
                <FileArchive size={17} /> Everything inside <span className="font-normal opacity-55">{formatSize(bytes)}</span>
              </Button>
            ) : (
              <span className="flex h-12 items-center justify-center gap-2 rounded-xl border border-white/[0.06] text-[0.88rem] text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> Gathering its files
              </span>
            )
          }
        >
          {own.length > 0 && (
            <Button onClick={() => startJob("zip", asDownload(own), name)} className="col-span-2">
              <Download size={16} /> {model ? "Its model and art" : "Its art"} <span className="font-normal text-ink-400">{formatSize(own.reduce((n, e) => n + e.size, 0))}</span>
            </Button>
          )}
        </SideActions>
        <DotadexCard href={`${DOTADEX}/item/${item.id}`} />
      </DetailTop>

      <div className="page-x mt-12 space-y-14">
        <Section title={everyone ? "The stickers inside" : "What it gives"} count={drops.length} sub={item.prefab === "sticker_capsule" ? "One of these, at random" : "One of these each time it is opened, the rarest first"}>
          <div className="space-y-10">
            {groups.map(([r, ids]) => {
              const rare = catalog.rarities[r];
              return (
                <div key={r || "none"}>
                  {groups.length > 1 && (
                    <h3 className="mb-4 flex items-center gap-2.5 text-[1.02rem] font-medium">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: rare?.color || "var(--color-ink-500)" }} />
                      {rare?.name || prefabTitle(catalog.items[ids[0]].prefab)}
                      <span className="text-[0.9rem] font-normal text-ink-500 tabular-nums">{formatCount(ids.length)}</span>
                    </h3>
                  )}
                  <Progressive
                    items={ids}
                    step={36}
                    className={GRID.item}
                    render={(id, i) => <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={Math.min(i % 36, 24) * 20} list={drops} />}
                  />
                </div>
              );
            })}
          </div>
        </Section>

        {extras.map(([r, ids]) => (
          <Section key={r} title={BONUS[r] || `${r.replace(/_/g, " ")} bonus`} count={ids.length} sub="A chance on top of what it gives">
            <Progressive items={ids} step={36} className={GRID.item} render={(id, i) => <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={Math.min(i % 36, 24) * 20} list={ids} />} />
          </Section>
        ))}

        {siblings.length > 0 && (
          <Section title={`More from ${event}`} count={siblings.length} sub="The other treasures and capsules of the same event">
            <Progressive items={siblings} step={24} className={GRID.item} render={(id, i) => <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={Math.min(i % 24, 16) * 20} list={siblings} />} />
          </Section>
        )}

        {own.length > 0 && (
          <Section title="Its own files" count={own.length} sub="The treasure's art and model">
            <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-1.5 sm:p-2">
              <FileTable entries={own} route={route} height={`${Math.min(20, Math.max(1, own.length) * 2.75 + 0.5)}rem`} />
            </div>
          </Section>
        )}
      </div>
    </Page>
  );
}
