import { useMemo, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { Music, CreditCard, Flag, Gem, Image as ImageIcon, KeyRound, Map as MapIcon, Mic, Monitor, MousePointer2, Package, Shield, Smile, Sticker, Swords } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { imageUrl, prefabTitle } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import { searchNames } from "../lib/smart.js";
import ItemCard from "./ItemCard.jsx";
import HeroPicker from "./HeroPicker.jsx";
import { link } from "../lib/route.js";
import { Button, Dropdown, Empty, GRID, Page, PageHead, SearchField, Section, Segmented, Spinner, Toolbar, useMore, LoadingList, Progressive } from "./ui.jsx";

const PAGE = 60;

// The kinds of item (items_game's prefabs) in sections a player knows them by; a kind the game adds
// later lands in Other until it gets a place here
const SECTIONS = [
  ["Hero items", ["wearable", "taunt", "default_item"]],
  ["Treasures", ["treasures", "treasure_chest", "retired_treasure_chest", "sticker_capsule", "key"]],
  ["Couriers and wards", ["courier", "courier_wearable", "courier_effect", "ward"]],
  ["Screens and interface", ["loading_screen", "hud_skin", "cursor_pack", "versus_screen", "emblem", "emoticon_tool", "player_card"]],
  ["Music and voices", ["announcer"]],
  ["The map", ["terrain", "weather", "map_effect", "radiantcreeps", "direcreeps", "radiantsiegecreeps", "diresiegecreeps", "radianttowers", "diretowers", "roshan", "tormentor", "ancient", "summons"]],
  ["Effects", ["teleport_effect", "streak_effect", "kill_effect", "blink_effect", "head_effect", "death_effect"]],
  ["Collectibles", ["sticker", "pennant", "socket_gem", "showcase_decoration", "misc"]],
];
// The prefabs whose own words run together
const TITLES = {
  radiantcreeps: "Radiant Creeps",
  direcreeps: "Dire Creeps",
  radiantsiegecreeps: "Radiant Siege Creeps",
  diresiegecreeps: "Dire Siege Creeps",
  radianttowers: "Radiant Towers",
  diretowers: "Dire Towers",
  default_item: "Default Items",
  wearable: "Wearables",
  bundle: "Bundles",
  taunt: "Taunts",
  treasure_chest: "Treasure Chests",
  retired_treasure_chest: "Retired Treasures",
  sticker_capsule: "Sticker Capsules",
  key: "Keys",
  courier: "Couriers",
  courier_wearable: "Courier Wearables",
  courier_effect: "Courier Effects",
  ward: "Wards",
  loading_screen: "Loading Screens",
  hud_skin: "HUD Skins",
  cursor_pack: "Cursor Packs",
  versus_screen: "Versus Screens",
  emblem: "Emblems",
  emoticon_tool: "Emoticons",
  player_card: "Player Cards",
  announcer: "Announcers",
  terrain: "Terrains",
  sticker: "Stickers",
  pennant: "Pennants",
  socket_gem: "Gems",
  showcase_decoration: "Showcase Decorations",
  treasures: "All treasures",
};
const titleOf = (prefab) => TITLES[prefab] || prefabTitle(prefab);
// Kinds shown together as one: every treasure and capsule, what they give inside
const MERGED = { treasures: ["treasure_chest", "retired_treasure_chest", "sticker_capsule"] };
// An event's page: /cosmetics/event-international_2026 (EVENT_ID_INTERNATIONAL_2026)
export const eventKind = (id) => `event-${id.replace(/^EVENT_ID_/, "").toLowerCase()}`;
const eventOf = (prefab) => (prefab.startsWith("event-") ? `EVENT_ID_${prefab.slice(6).toUpperCase()}` : "");
const inKind = (prefab) =>
  eventOf(prefab) ? (i) => i.event === eventOf(prefab) : MERGED[prefab] ? (i) => MERGED[prefab].includes(i.prefab) : (i) => i.prefab === prefab;

const SORTS = [
  ["new", "Newest first"],
  ["name", "By name"],
  ["rarity", "Rarest first"],
];

// Every item of a kind (couriers, wards, loading screens...), or the kinds to pick from
export default function CosmeticsPage({ prefab, catalog }) {
  if (!catalog) return prefab ? <LoadingList title={prefab === "treasures" ? "Treasures" : titleOf(prefab)} /> : <LoadingList title="Cosmetics" grid={GRID.tile} ratio="aspect-[16/9]" count={12} tabs={<CosmeticsTabs current="/cosmetics" />} />;
  if (prefab) return <Kind key={prefab} prefab={prefab} catalog={catalog} />;
  return <Kinds catalog={catalog} />;
}

// Kinds as tiles: even columns filling the width, more of them on a wider screen
const TILES = "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-[2200px]:grid-cols-6";

// The parts of cosmetics a player looks for most, as tabs over each of their pages
const HUB = [
  ["/cosmetics", "Overview"],
  ["/sets", "Sets"],
  ["/bundles", "Bundles"],
  ["/cosmetics/treasures", "Treasures"],
  ["/music", "Music"],
];
export function CosmeticsTabs({ current, className = "mt-7" }) {
  return <Segmented label="Cosmetics" value={current} items={HUB.map(([path, title]) => [path, title, null, link(path)])} variant="line" className={className} />;
}

// A kind pictured by the site's own renders of its latest models (previews/<model>.webp, one look
// for all), up to three; an item without a model of its own lends its bundle's
export const previewOf = (item, catalog) => {
  const own = item.refs.models?.[0] || item.bundle?.map((id) => catalog.items[id]?.refs.models?.[0]).find(Boolean);
  return own ? fileUrl(datasetById("models"), `previews/${own.replace(/\.$/, "")}.webp`) : "";
};
// A kind's pictures: [{ url, flat }], renders of its latest models, or for a kind without models
// (loading screens, keys, emblems) the game's own icons of its latest items (flat)
export const picturesOf = (items, catalog) => {
  const latest = [...items].sort((x, y) => (y.date || "").localeCompare(x.date || ""));
  const out = [];
  for (const it of latest) {
    const url = previewOf(it, catalog);
    if (url && !out.some((p) => p.url === url)) out.push({ url });
    if (out.length === 3) return out;
  }
  if (out.length) return out;
  for (const it of latest) {
    if (it.icon && !out.some((p) => p.url === imageUrl(it.icon))) out.push({ url: imageUrl(it.icon), flat: true });
    if (out.length === 3) break;
  }
  return out;
};
// The kinds without models, by a sign of what they are
const SIGNS = {
  loading_screen: ImageIcon,
  versus_screen: Swords,
  hud_skin: Monitor,
  cursor_pack: MousePointer2,
  emoticon_tool: Smile,
  emblem: Shield,
  player_card: CreditCard,
  announcer: Mic,
  terrain: MapIcon,
  weather: MapIcon,
  sticker: Sticker,
  sticker_capsule: Sticker,
  pennant: Flag,
  socket_gem: Gem,
  key: KeyRound,
};

function Kinds({ catalog }) {
  // A search over every item: by name, hero, kind or event; the latest first
  const [query, setQuery] = useState("");
  const [more, setMore] = useState(1);
  // forgiving typos and taking beginnings, best first (lib/smart.js)
  const found = useMemo(() => (query.trim() ? searchNames(catalog, query).items : null), [query, catalog]);
  const { count, covers } = useMemo(() => {
    const byKind = {};
    for (const item of Object.values(catalog.items)) (byKind[item.prefab] ??= []).push(item);
    for (const [k, kinds] of Object.entries(MERGED)) byKind[k] = kinds.flatMap((p) => byKind[p] || []);
    const count = Object.fromEntries(Object.entries(byKind).map(([k, l]) => [k, l.length]));
    const covers = Object.fromEntries(Object.entries(byKind).map(([k, l]) => [k, picturesOf(l, catalog)]));
    return { count, covers };
  }, [catalog]);
  const known = new Set(["music", "bundle", ...SECTIONS.flatMap(([, kinds]) => kinds), ...Object.values(MERGED).flat()]);
  const other = Object.keys(count)
    .filter((k) => !known.has(k))
    .sort((a, b) => count[b] - count[a]);
  const sections = [...SECTIONS, ["Other", other]].map(([title, kinds]) => [title, kinds.filter((k) => count[k])]).filter(([, kinds]) => kinds.length);
  // The sets pictured by the latest ones
  const setCovers = useMemo(() => {
    return picturesOf(Object.values(catalog.items).filter((i) => i.set && i.prefab === "wearable"), catalog);
  }, [catalog]);
  // The events and battle passes, the latest first, each pictured by its treasures first
  const events = useMemo(() => {
    const by = new Map();
    for (const item of Object.values(catalog.items)) {
      if (!item.event) continue;
      const e = by.get(item.event) || by.set(item.event, { id: item.event, items: [], date: "" }).get(item.event);
      e.items.push(item);
      if (item.date > e.date) e.date = item.date;
    }
    return [...by.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((e) => ({ ...e, n: e.items.length, icons: picturesOf(e.items, catalog) }));
  }, [catalog]);

  // A kind: its pictures on a stage (the latest in front, two behind it), its name and how many
  const tile = (href, title, n, pictures, i, sign = Package) => {
    const Sign = sign;
    const [front, ...behind] = pictures;
    const flat = front?.flat;
    const hide = (e) => (e.currentTarget.style.display = "none");
    return (
      <a
        key={href}
        href={link(href)}
        style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }}
        className="anim-card group relative overflow-hidden rounded-2xl border border-white/[0.06] frost transition-[border-color,transform] duration-300 hover:-translate-y-0.5 hover:border-white/[0.15]"
      >
        <div className="stage relative aspect-[16/10] overflow-hidden">
          {!front && (
            <div className="flex h-full items-center justify-center">
              <Sign size={40} strokeWidth={1.2} className="text-ink-500 transition-colors group-hover:text-ink-300" />
            </div>
          )}
          {front && flat && (
            <div className="absolute inset-0 flex items-center justify-center">
              {[behind[0], front, behind[1]].map((p, k) =>
                p ? (
                  <img
                    key={p.url}
                    src={p.url}
                    alt=""
                    loading="lazy"
                    onError={hide}
                    className={`w-[44%] rounded-lg border border-white/10 shadow-[0_14px_30px_-12px_rgb(0_0_0/0.9)] transition-transform duration-500 ease-[var(--ease-out-soft)] ${
                      k === 1 ? "relative z-10 group-hover:-translate-y-1.5" : k === 0 ? "-mr-[14%] -rotate-[8deg] opacity-80 group-hover:-rotate-[12deg]" : "-ml-[14%] rotate-[8deg] opacity-80 group-hover:rotate-[12deg]"
                    }`}
                  />
                ) : null
              )}
            </div>
          )}
          {front && !flat && (
            <>
              {behind[0] && <img src={behind[0].url} alt="" loading="lazy" onError={hide} className="absolute top-[14%] left-[2%] h-[70%] w-[44%] object-contain opacity-55 transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:-translate-x-1.5" />}
              {behind[1] && <img src={behind[1].url} alt="" loading="lazy" onError={hide} className="absolute top-[14%] right-[2%] h-[70%] w-[44%] object-contain opacity-55 transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:translate-x-1.5" />}
              <img src={front.url} alt="" loading="lazy" onError={hide} className="absolute inset-x-[18%] top-[4%] h-[92%] w-[64%] object-contain drop-shadow-[0_18px_24px_rgb(0_0_0/0.6)] transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-[1.06]" />
            </>
          )}
        </div>
        <div className="flex items-baseline justify-between gap-3 px-4 py-3">
          <span className="truncate text-[0.95rem] font-medium">{title}</span>
          <span className="shrink-0 text-[0.8rem] text-ink-400 tabular-nums">{formatCount(n)}</span>
        </div>
      </a>
    );
  };

  let i = 0;
  const anchor = (title) => title.toLowerCase().replace(/[^a-z]+/g, "-");
  return (
    <Page>
      <PageHead title="Cosmetics" sub="Everything a player can own, by kind: hero items, sets and bundles, treasures, couriers, wards, screens, music and effects."
        search={
          <SearchField
            big
            value={query}
            onChange={(v) => {
              setQuery(v);
              setMore(1);
            }}
            placeholder={`Search ${formatCount(Object.keys(catalog.items).length)} items by name, hero, kind or event`}
          />
        }
      >
        <CosmeticsTabs current="/cosmetics" />
      </PageHead>

      <div className="page-x space-y-14 pt-8 sm:pt-12 lg:pt-16">
        {found && (
          <Section title={found.length === 1 ? "1 item" : `${formatCount(found.length)} items`} sub={`For “${query}”`}>
            {found.length === 0 && <Empty title="Nothing of that name" text="Try a shorter word, a hero's name or a kind like courier." />}
            <Progressive
              items={found}
              step={60}
              className={GRID.item}
              render={(item, n) => <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(n % 60, 30) * 15} list={found.map((x) => x.id)} />}
            />
          </Section>
        )}
        {!found &&
          sections.map(([title, kinds]) => (
            <Section key={title} id={anchor(title)} title={title} center>
              <div className={TILES}>
                {title === "Hero items" && tile("/sets", "Sets", catalog.setByKey.size, setCovers, i++)}
                {title === "Hero items" && tile("/bundles", "Bundles", count.bundle || 0, covers.bundle || [], i++)}
                {title === "Music and voices" && tile("/music", "Music Packs", count.music || 0, covers.music || [], i++, Music)}
                {kinds.map((k) => tile(`/cosmetics/${k}`, titleOf(k), count[k], covers[k] || [], i++, SIGNS[k]))}
              </div>
            </Section>
          ))}
        {!found && events.length > 0 && (
          <Section id={anchor("Events and battle passes")} title="Events and battle passes" count={events.length} center sub="Every battle pass, The International and seasonal event, the latest first, with all it brought">
            <div className={TILES}>{events.map((e) => tile(`/cosmetics/${eventKind(e.id)}`, catalog.events?.[e.id] || e.id, e.n, e.icons, i++))}</div>
          </Section>
        )}
      </div>
    </Page>
  );
}

// One kind's items: searched, filtered to a hero and a rarity, sorted, and in sections by hero,
// rarity, type or slot where the kind has more than one of them
export function Kind({ prefab, catalog, title, sub, tab }) {
  const all = useMemo(() => Object.values(catalog.items).filter(inKind(prefab)), [catalog, prefab]);
  const heroOf = (item) => catalog.heroById.get(item.heroes.find((h) => h.startsWith("npc_dota_hero_")));

  // The ways to group that tell this kind's items apart
  const groupings = useMemo(() => {
    const distinct = (f) => new Set(all.map(f).filter(Boolean)).size;
    const out = [["none", "No groups"]];
    if (all.filter((i) => heroOf(i)).length > all.length / 2) out.push(["hero", "By hero"]);
    if (distinct((i) => i.slot) > 1) out.push(["slot", "By slot"]);
    if (distinct((i) => i.type) > 1) out.push(["type", "By type"]);
    if (distinct((i) => i.rarity) > 1) out.push(["rarity", "By rarity"]);
    if (distinct((i) => i.date?.slice(0, 4)) > 1) out.push(["year", "By year"]);
    if (distinct((i) => i.prefab) > 1) out.push(["prefab", "By kind"]);
    if (distinct((i) => i.event) > 1) out.push(["event", "By event"]);
    return out;
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("new");
  const [group, setGroup] = useState(() => (eventOf(prefab) ? "prefab" : groupings.some(([g]) => g === "hero") ? "hero" : groupings.some(([g]) => g === "year") && all.some((i) => i.loot) ? "year" : "none"));
  const [heroKey, setHeroKey] = useState("");
  const [rarity, setRarity] = useState("");
  const [limit, setLimit] = useState(PAGE);
  const reset = () => setLimit(PAGE);

  const rarities = useMemo(() => {
    const n = {};
    for (const i of all) if (i.rarity) n[i.rarity] = (n[i.rarity] || 0) + 1;
    return Object.entries(n).sort((a, b) => (catalog.rarities[a[0]]?.order || 0) - (catalog.rarities[b[0]]?.order || 0));
  }, [all, catalog]);
  const heroes = useMemo(() => {
    const n = new Map();
    for (const i of all) {
      const h = heroOf(i);
      if (h) n.set(h, (n.get(h) || 0) + 1);
    }
    return [...n.entries()].sort((a, b) => a[0].name.localeCompare(b[0].name)).map(([hero, count]) => ({ hero, count }));
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  const shown = useMemo(() => {
    const match = fuzzyMatch(all, (i) => `${i.name} ${heroOf(i)?.name || ""} ${heroOf(i)?.key || ""}`, filter);
    
    const list = all.filter(
      (i) => (!heroKey || heroOf(i)?.key === heroKey) && (!rarity || i.rarity === rarity) && (!match || match.has(i))
    );
    const order = (i) => catalog.rarities[i.rarity]?.order || 0;
    const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
    const sorts = { new: (a, b) => (b.date || "").localeCompare(a.date || "") || Number(b.id) - Number(a.id), name: byName, rarity: (a, b) => order(b) - order(a) || byName(a, b) };
    return list.sort(sorts[sort]);
  }, [all, filter, heroKey, rarity, sort, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sections in the order of their names (heroes, slots, types) or of rarity; items without one last
  const sections = useMemo(() => {
    if (group === "none") return [["", shown]];
    const keyOf = { hero: (i) => heroOf(i)?.name, slot: (i) => i.slot, type: (i) => i.type, rarity: (i) => catalog.rarities[i.rarity]?.name, year: (i) => i.date?.slice(0, 4), prefab: (i) => titleOf(i.prefab), event: (i) => catalog.events?.[i.event] }[group];
    const by = new Map();
    for (const i of shown) {
      const k = keyOf(i) || "";
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(i);
    }
    const rank = (k) => (group === "rarity" ? -(Object.values(catalog.rarities).find((r) => r.name === k)?.order || 0) : group === "year" ? -Number(k) : 0);
    return [...by.entries()].sort(([a], [b]) => !a - !b || rank(a) - rank(b) || a.localeCompare(b));
  }, [shown, group, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = useMemo(() => sections.flatMap(([, l]) => l.map((i) => i.id)), [sections]);
  const more = useMore(() => setLimit((l) => l + PAGE), limit < shown.length, limit);
  let left = limit;
  const none = { hero: "Without a hero", slot: "Without a slot", type: "Without a type", rarity: "Without a rarity", year: "Without a date", prefab: "Other", event: "Without an event" }[group];
  if (prefab === "treasures") tab = "/cosmetics/treasures";
  const name = title || (eventOf(prefab) ? catalog.events?.[eventOf(prefab)] || eventOf(prefab) : titleOf(prefab));
  const filtered = filter || heroKey || rarity;

  return (
    <Page>
      <PageHead
        crumbs={tab ? null : [["/cosmetics", "Cosmetics"], ["", name]]}
        title={name}
        sub={sub || `${formatCount(all.length)} of them, each with its model, textures and icon.`}
        search={
          <SearchField
            big
            value={filter}
            onChange={(v) => {
              setFilter(v);
              reset();
            }}
            placeholder={heroes.length ? `Search ${formatCount(all.length)} by name or hero` : `Search ${formatCount(all.length)} by name`}
          />
        }
      >
        {tab && <CosmeticsTabs current={tab} />}
      </PageHead>

      <Toolbar>
        <div className="grid grid-cols-2 gap-2 max-sm:w-full sm:flex sm:flex-wrap sm:items-center">
          {rarities.length > 1 && (
            <Dropdown
              value={rarity}
              onChange={(v) => (setRarity(v), reset())}
              label="Rarity"
              options={[
                ["", "Any rarity"],
                ...rarities.map(([key, n]) => [
                  key,
                  <span key={key} className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ background: catalog.rarities[key]?.color || "#888" }} />
                    {catalog.rarities[key]?.name || key}
                    <span className="text-ink-500 tabular-nums">{formatCount(n)}</span>
                  </span>,
                ]),
              ]}
            />
          )}
          {heroes.length > 1 && <HeroPicker heroes={heroes} value={heroKey} onChange={(v) => (setHeroKey(v), reset())} className="[&>button]:w-full [&>button]:min-w-0 sm:[&>button]:min-w-[13rem]" />}
          {groupings.length > 1 && <Dropdown value={group} onChange={(v) => (setGroup(v), reset())} options={groupings} label="Group" />}
          <Dropdown value={sort} onChange={(v) => (setSort(v), reset())} options={SORTS} label="Sort" />
        </div>
      </Toolbar>

      <div className="page-x pt-4">
        {filtered && <p className="mb-5 text-[0.86rem] text-ink-400 tabular-nums">{formatCount(shown.length)} of {formatCount(all.length)}</p>}
        {shown.length === 0 && <Empty title="Nothing fits" text="Clear the search or a filter to see more." />}

        <div className="space-y-12">
          {sections.map(([title, list]) => {
            if (left <= 0) return null;
            const part = list.slice(0, left);
            left -= part.length;
            return group !== "none" ? (
              <Section key={title || "all"} title={title || none} count={list.length}>
                <div className={GRID.item}>
                  {part.map((item, i) => (
                    <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 30) * 15} list={ids} />
                  ))}
                </div>
              </Section>
            ) : (
              <div key="all" className={GRID.item}>
                {part.map((item, i) => (
                  <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 30) * 15} list={ids} />
                ))}
              </div>
            );
          })}
        </div>
        <div ref={more} />
      </div>
    </Page>
  );
}
