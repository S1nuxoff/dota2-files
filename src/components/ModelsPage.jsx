import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box, Download, LoaderCircle, Search } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { heroPortrait, imageUrl } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { navigate } from "../lib/route.js";

const CARD_W = 184;
const CARD_H = 228;

const SORTS = [
  ["name", "Name"],
  ["size-desc", "Largest"],
  ["size-asc", "Smallest"],
  ["kind", "Kind"],
];

const pretty = (file) => file.replace(/\.glb$/, "").replace(/_/g, " ");
const words = (folder) => folder.replace(/_assets$/, "").replace(/_/g, " ");

// A model without a name from the game is placed by its folder: models/props_rock/... is a prop of
// the group "rock", models/creeps/... is "creeps"; the maps' scenes are "map"
function placeOf(e) {
  const seg = e.path.split("/");
  if (e.ds === "maps") return ["map", words(seg[1] || "")];
  const top = seg.length > 2 ? seg[1] : "other";
  if (top === "props") return ["props", words(seg[2])];
  if (top.startsWith("props_")) return ["props", words(top.slice(6))];
  // Unnamed parts of heroes and items are still theirs
  if (top === "heroes") return ["hero", ""];
  if (top === "items") return ["cosmetic", ""];
  return [words(top), ""];
}

// Every 3D model of the datasets (models and maps) as cards; a model belongs to a hero by its item
// or by its folder (models/heroes/<token>/, models/items/<token>/), and shows that item's icon or the
// hero's portrait
export default function ModelsPage({ catalog, indexes, route }) {
  const [filter, setFilter] = useState("");
  const [kind, setKind] = useState("");
  const [heroKey, setHeroKey] = useState("");
  const [sort, setSort] = useState("name");
  const ready = indexes.models && indexes.maps && catalog;

  const models = useMemo(() => {
    if (!ready) return [];
    const byStem = new Map();
    for (const item of Object.values(catalog.items)) {
      for (const prefix of item.refs.models || []) if (!byStem.has(prefix)) byStem.set(prefix, item);
    }
    const byToken = new Map();
    for (const hero of catalog.heroes) for (const t of hero.tokens) byToken.set(t, hero);
    const previews = new Set(indexes.models.entries.filter((e) => e.path.startsWith("previews/")).map((e) => e.path));
    const out = [];
    for (const ds of ["models", "maps"]) {
      for (const e of indexes[ds].entries) {
        if (e.ext !== "glb" || e.path.startsWith("previews/")) continue;
        const item = byStem.get(e.path.slice(0, -3));
        const seg = e.path.split("/");
        const hero =
          (item?.heroes.length && catalog.heroById.get(item.heroes[0])) ||
          (seg[0] === "models" && (seg[1] === "heroes" || seg[1] === "items") ? byToken.get(seg[2]) : null) ||
          null;
        const [place, group] = placeOf(e);
        const k = e.tag || (item ? "cosmetic" : place);
        out.push({
          e,
          name: e.title || item?.name || pretty(e.name),
          kind: k,
          group: e.tag || item ? "" : group,
          hero,
          // The tracker's picture of the model itself (previews/<path>.webp), else its item's icon
          icon: previews.has(`previews/${e.path.slice(0, -4)}.webp`)
            ? fileUrl(datasetById(e.ds), `previews/${e.path.slice(0, -4)}.webp`)
            : item?.icon
              ? imageUrl(item.icon)
              : k === "hero" && hero
                ? heroPortrait(hero)
                : "",
          preview: previews.has(`previews/${e.path.slice(0, -4)}.webp`),
          hay: `${e.title} ${item?.name || ""} ${e.path} ${hero?.name || ""}`.toLowerCase(),
        });
      }
    }
    return out;
  }, [ready, catalog, indexes]);

  // Kinds of fewer than 20 models go together as "other"
  useMemo(() => {
    const count = {};
    for (const m of models) count[m.kind] = (count[m.kind] || 0) + 1;
    for (const m of models) if (count[m.kind] < 20) m.kind = "other";
  }, [models]);
  const count = (list, key) => {
    const out = {};
    for (const m of list) if (m[key]) out[m[key]] = (out[m[key]] || 0) + 1;
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  };
  const kinds = useMemo(() => count(models, "kind"), [models]);
  const [group, setGroup] = useState("");
  const groups = useMemo(() => (kind ? count(models.filter((m) => m.kind === kind), "group") : []), [models, kind]);

  const shown = useMemo(() => {
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
    const list = models.filter((m) => (!kind || m.kind === kind) && (!group || m.group === group) && (!heroKey || m.hero?.key === heroKey) && words.every((w) => m.hay.includes(w)));
    const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
    const order = {
      name: byName,
      "size-desc": (a, b) => b.e.size - a.e.size,
      "size-asc": (a, b) => a.e.size - b.e.size,
      kind: (a, b) => a.kind.localeCompare(b.kind) || byName(a, b),
    }[sort];
    return list.sort(order);
  }, [models, filter, kind, group, heroKey, sort]);

  const scroller = useRef(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);
  const columns = Math.max(1, Math.floor((width - 48) / CARD_W));
  const virtual = useVirtualizer({
    count: Math.ceil(shown.length / columns),
    getScrollElement: () => scroller.current,
    estimateSize: () => CARD_H + 12,
    overscan: 4,
  });
  useEffect(() => {
    virtual.measure();
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [filter, kind, group, heroKey, sort]);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-sm text-ink-400">
        <LoaderCircle size={16} className="animate-spin" /> Loading models…
      </div>
    );
  }

  const select = "h-9 rounded-lg border border-ink-800 bg-ink-900 px-2.5 text-sm text-ink-300 outline-none hover:border-ink-600";
  return (
    <>
      <div className="shrink-0 border-b border-ink-800 px-6 pt-6 pb-4">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-tight">3D models</h1>
            <p className="mt-1 text-sm text-ink-400">
              <span className="text-ink-100 tabular-nums">{formatCount(shown.length)}</span> of {formatCount(models.length)} models · glb with textures and
              animations
            </p>
          </div>
          <label className="flex h-9 w-64 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 focus-within:border-ink-600">
            <Search size={14} className="text-ink-400" />
            <input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by name or path"
              className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
            />
          </label>
          <select value={heroKey} onChange={(e) => setHeroKey(e.target.value)} className={select}>
            <option value="">Every hero</option>
            {catalog.heroes.map((h) => (
              <option key={h.key} value={h.key}>
                {h.name}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value)} className={select}>
            {SORTS.map(([v, t]) => (
              <option key={v} value={v}>
                Sort: {t}
              </option>
            ))}
          </select>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          {[["", models.length], ...kinds].map(([k, n]) => (
            <button
              key={k}
              onClick={() => (setKind(k), setGroup(""))}
              className={`h-7 rounded-full px-3 text-xs capitalize transition ${kind === k ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-ink-850 hover:text-ink-100"}`}
            >
              {k || "All"} <span className="ml-0.5 opacity-60 tabular-nums">{formatCount(n)}</span>
            </button>
          ))}
        </div>
        {groups.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5 border-t border-ink-800 pt-3">
            {[["", null], ...groups].map(([g, n]) => (
              <button
                key={g}
                onClick={() => setGroup(g)}
                className={`h-6 rounded-full px-2.5 text-[11px] capitalize transition ${group === g ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:bg-ink-850 hover:text-ink-100"}`}
              >
                {g || "Every group"} {n != null && <span className="ml-0.5 opacity-60 tabular-nums">{formatCount(n)}</span>}
              </button>
            ))}
          </div>
        )}
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {shown.length === 0 && <div className="p-10 text-center text-sm text-ink-400">Nothing found.</div>}
        <div style={{ height: virtual.getTotalSize(), position: "relative" }} className="mx-6 my-5">
          {virtual.getVirtualItems().map((line) => (
            <div
              key={line.key}
              className="grid gap-3"
              style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${line.start}px)`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {shown.slice(line.index * columns, line.index * columns + columns).map((m) => (
                <Card key={`${m.e.ds}:${m.e.path}`} m={m} active={route.file === `${m.e.ds}:${m.e.path}`} onOpen={() => navigate({ ...route, file: `${m.e.ds}:${m.e.path}` })} />
              ))}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Card({ m, active, onOpen }) {
  const ds = datasetById(m.e.ds);
  return (
    <div
      onClick={onOpen}
      style={{ height: CARD_H }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-ink-900 transition ${active ? "border-ink-400" : "border-ink-800 hover:border-ink-600"}`}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-ink-850">
        {m.icon ? (
          <img
            src={m.icon}
            loading="lazy"
            decoding="async"
            alt=""
            className={`h-full w-full transition duration-300 group-hover:scale-105 ${m.preview ? "object-contain p-2" : "object-cover"}`}
          />
        ) : (
          <Box size={30} strokeWidth={1.25} className="text-ink-600 transition group-hover:text-ink-400" />
        )}
        <a
          href={fileUrl(ds, m.e.path, true)}
          onClick={(ev) => ev.stopPropagation()}
          title={`Download ${m.e.name}`}
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-md bg-ink-950/80 text-ink-300 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-ink-100"
        >
          <Download size={15} />
        </a>
      </div>
      <div className="shrink-0 px-3 py-2.5 leading-tight">
        <div className="truncate text-sm">{m.name}</div>
        <div className="mt-1 flex items-center justify-between gap-2 text-[11px] text-ink-400">
          <span className="truncate capitalize">{m.hero ? `${m.hero.name} · ${m.kind}` : m.group ? `${m.kind} · ${m.group}` : m.kind}</span>
          <span className="shrink-0 tabular-nums">{formatSize(m.e.size)}</span>
        </div>
      </div>
    </div>
  );
}
