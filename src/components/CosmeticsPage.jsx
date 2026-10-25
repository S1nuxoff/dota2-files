import { useMemo, useState } from "react";
import { ChevronLeft, Search } from "lucide-react";
import { imageUrl, prefabTitle } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import ItemCard from "./ItemCard.jsx";
import HeroPicker from "./HeroPicker.jsx";
import { link } from "../lib/route.js";
import { Chip, Dropdown, PageHead, SearchField, Spinner } from "./ui.jsx";

const PAGE = 240;

// The kinds of item (items_game's prefabs) in sections a player knows them by; a kind the game adds
// later lands in Other until it gets a place here
const SECTIONS = [
  ["Hero items", ["wearable", "bundle", "taunt", "default_item"]],
  ["Couriers and wards", ["courier", "courier_wearable", "courier_effect", "ward"]],
  ["Screens and interface", ["loading_screen", "hud_skin", "cursor_pack", "versus_screen", "emblem", "emoticon_tool", "player_card"]],
  ["Music and voices", ["music", "announcer"]],
  ["The map", ["terrain", "weather", "map_effect", "radiantcreeps", "direcreeps", "radiantsiegecreeps", "diresiegecreeps", "radianttowers", "diretowers", "roshan", "tormentor", "ancient", "summons"]],
  ["Effects", ["teleport_effect", "streak_effect", "kill_effect", "blink_effect", "head_effect", "death_effect"]],
  ["Collectibles", ["sticker", "sticker_capsule", "pennant", "socket_gem", "showcase_decoration", "misc"]],
  ["Treasures", ["treasure_chest", "retired_treasure_chest", "key"]],
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
};
const titleOf = (prefab) => TITLES[prefab] || prefabTitle(prefab);

const SORTS = [
  ["new", "Newest first"],
  ["name", "By name"],
  ["rarity", "Rarest first"],
];

// Every item of a kind (couriers, wards, loading screens...), or the kinds to pick from
export default function CosmeticsPage({ prefab, catalog }) {
  if (!catalog) return <Spinner text="Loading the catalog" />;
  if (prefab) return <Kind key={prefab} prefab={prefab} catalog={catalog} />;
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <Kinds catalog={catalog} />
    </div>
  );
}

function Kinds({ catalog }) {
  const { count, covers } = useMemo(() => {
    const count = {};
    const covers = {};
    for (const item of Object.values(catalog.items)) {
      count[item.prefab] = (count[item.prefab] || 0) + 1;
      if (item.icon && !covers[item.prefab]) covers[item.prefab] = item.icon;
    }
    return { count, covers };
  }, [catalog]);
  const known = new Set(SECTIONS.flatMap(([, kinds]) => kinds));
  const other = Object.keys(count)
    .filter((k) => !known.has(k))
    .sort((a, b) => count[b] - count[a]);
  const sections = [...SECTIONS, ["Other", other]].map(([title, kinds]) => [title, kinds.filter((k) => count[k])]).filter(([, kinds]) => kinds.length);
  const firstSet = [...catalog.setByKey.values()].find((s) => s.icon);

  const tile = (href, title, n, icon, i) => (
    <a
      key={href}
      href={link(href)}
      style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }}
      className="anim-card group flex items-center gap-4 rounded-2xl border border-white/[0.06] bg-ink-850 p-3 transition-colors hover:border-white/[0.14]"
    >
      <div className="h-16 w-20 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_50%_45%,#26262a_0%,#18181b_72%)]">
        {icon && <img src={imageUrl(icon)} alt="" loading="lazy" className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.06]" />}
      </div>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[0.95rem] font-medium">{title}</div>
        <div className="mt-1 text-[0.82rem] text-ink-400 tabular-nums">{formatCount(n)}</div>
      </div>
    </a>
  );

  let i = 0;
  return (
    <div className="anim-page">
      <PageHead title="Cosmetics" sub="Everything a player can own, by kind: the heroes' items, couriers, wards, loading screens, music, effects." />
      <div className="mx-auto max-w-[100rem] space-y-10 px-8 pb-20">
        {sections.map(([title, kinds]) => (
          <section key={title}>
            <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">{title}</h2>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(15rem,1fr))] gap-4">
              {title === "Hero items" && tile("/sets", "Sets", catalog.setByKey.size, firstSet?.icon, i++)}
              {kinds.map((k) => tile(`/cosmetics/${k}`, titleOf(k), count[k], covers[k], i++))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

// One kind's items: searched, filtered to a hero and a rarity, sorted, and in sections by hero,
// rarity, type or slot where the kind has more than one of them
function Kind({ prefab, catalog }) {
  const all = useMemo(() => Object.values(catalog.items).filter((i) => i.prefab === prefab), [catalog, prefab]);
  const heroOf = (item) => catalog.heroById.get(item.heroes.find((h) => h.startsWith("npc_dota_hero_")));

  // The ways to group that tell this kind's items apart
  const groupings = useMemo(() => {
    const distinct = (f) => new Set(all.map(f).filter(Boolean)).size;
    const out = [["none", "No groups"]];
    if (all.filter((i) => heroOf(i)).length > all.length / 2) out.push(["hero", "By hero"]);
    if (distinct((i) => i.slot) > 1) out.push(["slot", "By slot"]);
    if (distinct((i) => i.type) > 1) out.push(["type", "By type"]);
    if (distinct((i) => i.rarity) > 1) out.push(["rarity", "By rarity"]);
    return out;
  }, [all]); // eslint-disable-line react-hooks/exhaustive-deps

  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("new");
  const [group, setGroup] = useState(() => (groupings.some(([g]) => g === "hero") ? "hero" : "none"));
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
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
    const list = all.filter(
      (i) => (!heroKey || heroOf(i)?.key === heroKey) && (!rarity || i.rarity === rarity) && words.every((w) => `${i.name} ${heroOf(i)?.name || ""}`.toLowerCase().includes(w))
    );
    const order = (i) => catalog.rarities[i.rarity]?.order || 0;
    const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
    const sorts = { new: (a, b) => Number(b.id) - Number(a.id), name: byName, rarity: (a, b) => order(b) - order(a) || byName(a, b) };
    return list.sort(sorts[sort]);
  }, [all, filter, heroKey, rarity, sort, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sections in the order of their names (heroes, slots, types) or of rarity; items without one last
  const sections = useMemo(() => {
    if (group === "none") return [["", shown]];
    const keyOf = { hero: (i) => heroOf(i)?.name, slot: (i) => i.slot, type: (i) => i.type, rarity: (i) => catalog.rarities[i.rarity]?.name }[group];
    const by = new Map();
    for (const i of shown) {
      const k = keyOf(i) || "";
      if (!by.has(k)) by.set(k, []);
      by.get(k).push(i);
    }
    const rank = (k) => (group === "rarity" ? -(Object.values(catalog.rarities).find((r) => r.name === k)?.order || 0) : 0);
    return [...by.entries()].sort(([a], [b]) => !a - !b || rank(a) - rank(b) || a.localeCompare(b));
  }, [shown, group, catalog]); // eslint-disable-line react-hooks/exhaustive-deps

  const ids = useMemo(() => sections.flatMap(([, l]) => l.map((i) => i.id)), [sections]);
  let left = limit;
  const none = { hero: "Without a hero", slot: "Without a slot", type: "Without a type", rarity: "Without a rarity" }[group];

  return (
    <div
      className="anim-page min-h-0 flex-1 overflow-y-auto"
      onScroll={(e) => {
        const el = e.currentTarget;
        if (el.scrollTop + el.clientHeight > el.scrollHeight - 800 && limit < shown.length) setLimit(limit + PAGE);
      }}
    >
      <div className="mx-auto max-w-[100rem] px-8 pt-6">
        <a href={link("/cosmetics")} className="inline-flex items-center gap-1 text-[0.88rem] text-ink-400 transition-colors hover:text-ink-100">
          <ChevronLeft size={16} /> Cosmetics
        </a>
      </div>
      <PageHead title={titleOf(prefab)} sub={`${formatCount(all.length)} of them, each with its model, textures and icon.`}>
        <SearchField
          value={filter}
          onChange={(v) => {
            setFilter(v);
            reset();
          }}
          icon={Search}
          placeholder={heroes.length ? "Search by name or hero" : "Search by name"}
        />
      </PageHead>

      <div className="mx-auto max-w-[100rem] px-8 pb-20">
        <div className="flex flex-wrap items-center gap-2 pb-6">
          {rarities.length > 1 && (
            <>
              <Chip active={!rarity} onClick={() => (setRarity(""), reset())}>
                Any rarity
              </Chip>
              {rarities.map(([key, n]) => (
                <Chip key={key} active={rarity === key} onClick={() => (setRarity(rarity === key ? "" : key), reset())}>
                  <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: catalog.rarities[key]?.color || "#888" }} />
                  {catalog.rarities[key]?.name || key}
                  <span className="ml-1.5 text-ink-400 tabular-nums">{formatCount(n)}</span>
                </Chip>
              ))}
            </>
          )}
          <div className="flex-1 pl-3 text-[0.88rem] text-ink-400">{formatCount(shown.length)} shown</div>
          {heroes.length > 1 && <HeroPicker heroes={heroes} value={heroKey} onChange={(v) => (setHeroKey(v), reset())} />}
          {groupings.length > 1 && <Dropdown value={group} onChange={(v) => (setGroup(v), reset())} options={groupings} />}
          <Dropdown value={sort} onChange={(v) => (setSort(v), reset())} options={SORTS} />
        </div>

        {shown.length === 0 && <p className="py-16 text-center text-ink-400">Nothing of that name.</p>}

        <div className="space-y-10">
          {sections.map(([title, list]) => {
            if (left <= 0) return null;
            const part = list.slice(0, left);
            left -= part.length;
            return (
              <section key={title || "all"}>
                {group !== "none" && (
                  <h2 className="mb-4 flex items-baseline gap-3 text-[1.15rem] font-semibold tracking-[-0.02em]">
                    {title || none}
                    <span className="text-[0.88rem] font-normal text-ink-400 tabular-nums">{formatCount(list.length)}</span>
                  </h2>
                )}
                <div className="grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4">
                  {part.map((item, i) => (
                    <ItemCard key={item.id} item={item} rarities={catalog.rarities} delay={Math.min(i, 30) * 15} list={ids} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}
