import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box, Download, LoaderCircle, Search } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { SIZES, loadModels, sizeOf } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import ModelPanel from "./ModelPanel.jsx";

const CARD_W = 184;
const CARD_H = 228;

const TYPES = [
  ["", "All"],
  ["heroes", "Heroes"],
  ["cosmetics", "Cosmetics"],
  ["units", "Units"],
  ["world", "World"],
  ["effects", "Effects"],
  ["scenes", "Scenes"],
  ["other", "Other"],
  ["technical", "Technical"],
];

const SORTS = [
  ["name", "Name"],
  ["size-desc", "Largest"],
  ["size-asc", "Smallest"],
  ["tris-desc", "Most triangles"],
  ["tris-asc", "Fewest triangles"],
];

const pretty = (s) => s.replace(/_/g, " ").replace(/\s+/g, " ").trim();
const previewUrl = (m) => fileUrl(datasetById("models"), `previews/${m.path.slice(0, -4)}.webp`);
const longest = (card) => (card.dims ? Math.max(...card.dims) : -1);

// Every 3D model as cards, one card for a model and its numbered copies (the tracker's variant key):
// by type, group, theme, hero, size, animated, from the tracker's catalog/models.json
export default function ModelsPage({ catalog, indexes }) {
  const [models, setModels] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    loadModels().then(setModels, (e) => setError(String(e.message || e)));
  }, []);

  const [type, setType] = useState("");
  const [group, setGroup] = useState("");
  const [theme, setTheme] = useState("");
  const [heroKey, setHeroKey] = useState("");
  const [size, setSize] = useState("");
  const [animated, setAnimated] = useState(false);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState("name");
  const [open, setOpen] = useState(null);

  const ready = models && catalog && indexes.models && indexes.maps && indexes.textures;

  // Files of the datasets by <dataset>:<path>, for sizes, names and the .gz copies
  const entries = useMemo(() => {
    if (!ready) return new Map();
    const out = new Map();
    for (const ds of ["models", "maps", "textures"]) for (const e of indexes[ds].entries) out.set(`${ds}:${e.path}`, e);
    return out;
  }, [ready, indexes]);

  const cards = useMemo(() => {
    if (!ready) return [];
    const byKey = new Map();
    for (const m of models) {
      const key = `${m.type}|${m.variant}`;
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(m);
    }
    const heroName = (key) => catalog.heroByKey.get(key)?.name || "";
    return [...byKey.entries()].map(([key, list]) => {
      list.sort((a, b) => a.path.localeCompare(b.path, "en", { numeric: true }));
      const first = list[0];
      const entry = entries.get(`${first.ds}:${first.path}`);
      const item = first.item && catalog.items[first.item];
      const name = entry?.title || item?.name || pretty(first.variant.split("/").pop() || first.path.split("/").pop().slice(0, -4));
      return {
        key,
        models: list,
        first,
        name,
        type: first.type,
        group: first.group,
        theme: first.theme,
        hero: first.hero,
        heroName: heroName(first.hero),
        dims: first.dims,
        size: sizeOf(first.dims),
        triangles: first.triangles ?? -1,
        animated: list.some((m) => m.animations > 0),
        preview: first.ds === "models",
        hay: `${name} ${list.map((m) => m.path).join(" ")} ${heroName(first.hero)} ${first.group} ${first.theme}`.toLowerCase(),
      };
    });
  }, [ready, models, catalog, entries]);

  const ofType = useMemo(() => cards.filter((c) => (type ? c.type === type : c.type !== "technical")), [cards, type]);
  const count = (list, pick) => {
    const out = {};
    for (const c of list) {
      const v = pick(c);
      if (v) out[v] = (out[v] || 0) + 1;
    }
    return Object.entries(out).sort((a, b) => b[1] - a[1]);
  };
  const groups = useMemo(() => count(ofType, (c) => c.group), [ofType]);
  const themes = useMemo(() => count(ofType, (c) => c.theme), [ofType]);
  const heroes = useMemo(() => count(ofType, (c) => c.hero), [ofType]);

  const shown = useMemo(() => {
    const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
    const list = ofType.filter(
      (c) =>
        (!group || c.group === group) &&
        (!theme || c.theme === theme) &&
        (!heroKey || c.hero === heroKey) &&
        (!size || c.size === size) &&
        (!animated || c.animated) &&
        words.every((w) => c.hay.includes(w))
    );
    const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
    const order = {
      name: byName,
      "size-desc": (a, b) => longest(b) - longest(a),
      "size-asc": (a, b) => (longest(a) < 0) - (longest(b) < 0) || longest(a) - longest(b),
      "tris-desc": (a, b) => b.triangles - a.triangles,
      "tris-asc": (a, b) => (a.triangles < 0) - (b.triangles < 0) || a.triangles - b.triangles,
    }[sort];
    return list.sort(order);
  }, [ofType, group, theme, heroKey, size, animated, filter, sort]);

  const scroller = useRef(null);
  const [width, setWidth] = useState(1000);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);
  const columns = Math.max(1, Math.floor((width - 40) / CARD_W));
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
  }, [type, group, theme, heroKey, size, animated, filter, sort]);

  const pickType = (t) => {
    setType(t);
    setGroup("");
    setTheme("");
    setHeroKey("");
  };

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-sm text-ink-400">
        {error ? `The list of models could not be loaded: ${error}` : <><LoaderCircle size={16} className="animate-spin" /> Loading models…</>}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="flex min-w-0 flex-1 flex-col">
        <div className="shrink-0 border-b border-ink-800 px-6 pt-6">
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <h1 className="text-2xl font-semibold tracking-tight">3D models</h1>
              <p className="mt-1 text-sm text-ink-400">
                <span className="text-ink-100 tabular-nums">{formatCount(shown.length)}</span> of {formatCount(cards.length)} models · glb with textures and
                animations
              </p>
            </div>
            <label className="flex h-9 w-72 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 px-3 focus-within:border-ink-600">
              <Search size={14} className="text-ink-400" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="rock, pine, courier, axe…"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-ink-400"
              />
            </label>
            <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-9 rounded-lg border border-ink-800 bg-ink-900 px-2.5 text-sm text-ink-300 outline-none">
              {SORTS.map(([v, t]) => (
                <option key={v} value={v}>
                  Sort: {t}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-4 flex gap-1">
            {TYPES.map(([t, title]) => {
              const n = t ? cards.filter((c) => c.type === t).length : cards.filter((c) => c.type !== "technical").length;
              if (t && !n) return null;
              return (
                <button
                  key={t}
                  onClick={() => pickType(t)}
                  className={`border-b-2 px-3 pb-2.5 text-sm transition ${type === t ? "border-accent text-ink-100" : "border-transparent text-ink-400 hover:text-ink-100"}`}
                >
                  {title} <span className="ml-1 text-xs text-ink-400 tabular-nums">{formatCount(n)}</span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex min-h-0 flex-1">
          <aside className="w-56 shrink-0 space-y-6 overflow-y-auto border-r border-ink-800 px-4 py-5">
            <Facet title="Size">
              <div className="flex flex-wrap gap-1">
                {SIZES.map(([id, title]) => (
                  <button
                    key={id}
                    onClick={() => setSize(size === id ? "" : id)}
                    className={`h-7 rounded-md px-2.5 text-xs transition ${size === id ? "bg-ink-100 text-ink-950" : "border border-ink-800 text-ink-400 hover:text-ink-100"}`}
                  >
                    {title}
                  </button>
                ))}
              </div>
              <label className="mt-3 flex cursor-pointer items-center gap-2 text-xs text-ink-300 select-none">
                <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} className="accent-accent" />
                Animated only
              </label>
            </Facet>
            {heroes.length > 1 && (
              <Facet title="Hero">
                <select value={heroKey} onChange={(e) => setHeroKey(e.target.value)} className="h-8 w-full rounded-md border border-ink-800 bg-ink-900 px-2 text-xs text-ink-300 outline-none">
                  <option value="">Every hero</option>
                  {heroes
                    .map(([k, n]) => [k, catalog.heroByKey.get(k)?.name || k, n])
                    .sort((a, b) => a[1].localeCompare(b[1]))
                    .map(([k, name, n]) => (
                      <option key={k} value={k}>
                        {name} ({n})
                      </option>
                    ))}
                </select>
              </Facet>
            )}
            {groups.length > 1 && <List title="Group" items={groups} value={group} onPick={setGroup} />}
            {themes.length > 0 && <List title="Theme" items={themes} value={theme} onPick={setTheme} />}
          </aside>

          <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
            {shown.length === 0 && <div className="p-10 text-center text-sm text-ink-400">Nothing found.</div>}
            <div style={{ height: virtual.getTotalSize(), position: "relative" }} className="mx-5 my-5">
              {virtual.getVirtualItems().map((line) => (
                <div
                  key={line.key}
                  className="grid gap-3"
                  style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${line.start}px)`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
                >
                  {shown.slice(line.index * columns, line.index * columns + columns).map((c) => (
                    <Card key={c.key} c={c} active={open?.key === c.key} onOpen={() => setOpen(c)} />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      {open && <ModelPanel key={open.key} card={open} entries={entries} onClose={() => setOpen(null)} />}
    </div>
  );
}

function Facet({ title, children }) {
  return (
    <div>
      <div className="mb-2 text-[11px] font-medium tracking-wider text-ink-400 uppercase">{title}</div>
      {children}
    </div>
  );
}

function List({ title, items, value, onPick }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 12);
  return (
    <Facet title={title}>
      <div className="flex flex-col">
        {shown.map(([k, n]) => (
          <button
            key={k}
            onClick={() => onPick(value === k ? "" : k)}
            className={`flex h-7 items-center justify-between rounded-md px-2 text-left text-xs capitalize transition ${value === k ? "bg-ink-850 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
          >
            <span className="truncate">{k}</span>
            <span className="text-[11px] text-ink-600 tabular-nums">{formatCount(n)}</span>
          </button>
        ))}
        {items.length > 12 && (
          <button onClick={() => setAll(!all)} className="mt-1 px-2 text-left text-[11px] text-ink-400 hover:text-ink-100">
            {all ? "Fewer" : `All ${items.length}`}
          </button>
        )}
      </div>
    </Facet>
  );
}

function Card({ c, active, onOpen }) {
  const [broken, setBroken] = useState(false);
  return (
    <div
      onClick={onOpen}
      style={{ height: CARD_H }}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-lg border bg-ink-900 transition ${active ? "border-ink-400" : "border-ink-800 hover:border-ink-600"}`}
    >
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[radial-gradient(ellipse_at_50%_45%,#1d2230_0%,#13161d_75%)]">
        {c.preview && !broken ? (
          <img
            src={previewUrl(c.first)}
            loading="lazy"
            decoding="async"
            alt=""
            onError={() => setBroken(true)}
            className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
          />
        ) : (
          <Box size={30} strokeWidth={1.25} className="text-ink-600" />
        )}
        {c.models.length > 1 && (
          <span className="absolute top-2 left-2 rounded bg-ink-950/80 px-1.5 py-0.5 text-[10.5px] text-ink-300 tabular-nums">{c.models.length} variants</span>
        )}
        <a
          href={fileUrl(datasetById(c.first.ds), c.first.path, true)}
          onClick={(ev) => ev.stopPropagation()}
          title="Download glb"
          className="absolute top-2 right-2 flex h-8 w-8 items-center justify-center rounded-md bg-ink-950/80 text-ink-300 opacity-0 backdrop-blur transition group-hover:opacity-100 hover:text-ink-100"
        >
          <Download size={15} />
        </a>
      </div>
      <div className="shrink-0 px-3 py-2.5 leading-tight">
        <div className="truncate text-sm capitalize">{c.name}</div>
        <div className="mt-1 truncate text-[11px] text-ink-400 capitalize">{[c.heroName, c.group, c.theme].filter(Boolean).join(" · ") || c.type}</div>
      </div>
    </div>
  );
}
