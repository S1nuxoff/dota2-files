import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box, Check, ChevronDown, Download, LoaderCircle, ScanSearch, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { SIZES, loadModels, sizeOf } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import { useRem } from "../lib/scale.js";
import ModelPanel from "./ModelPanel.jsx";
import ImageSearch from "./ImageSearch.jsx";
import { searchByWords } from "../lib/visual.js";

// In rem (lib/scale.js)
const CARD_W = 14;
const CARD_H = 16.5;

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
  ["size-desc", "Largest first"],
  ["size-asc", "Smallest first"],
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  // Results of a search by picture or by meaning: { label, picture, rank: model path -> place }
  const [similar, setSimilar] = useState(null);
  const [picking, setPicking] = useState(false);
  const [meaning, setMeaning] = useState(false);
  const [thinking, setThinking] = useState("");

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
    const words = similar || meaning ? [] : filter.toLowerCase().split(/\s+/).filter(Boolean);
    const list = ofType.filter(
      (c) =>
        (!group || c.group === group) &&
        (!theme || c.theme === theme) &&
        (!heroKey || c.hero === heroKey) &&
        (!size || c.size === size) &&
        (!animated || c.animated) &&
        words.every((w) => c.hay.includes(w))
    );
    // Nearest first: a card's place is its best variant's
    if (similar) {
      const place = (c) => Math.min(...c.models.map((m) => similar.rank.get(m.path) ?? Infinity));
      return list
        .map((c) => [place(c), c])
        .filter(([at]) => at < Infinity)
        .sort((a, b) => a[0] - b[0])
        .map(([, c]) => c);
    }
    const byName = (a, b) => a.name.localeCompare(b.name, "en", { numeric: true });
    const order = {
      name: byName,
      "size-desc": (a, b) => longest(b) - longest(a),
      "size-asc": (a, b) => (longest(a) < 0) - (longest(b) < 0) || longest(a) - longest(b),
      "tris-desc": (a, b) => b.triangles - a.triangles,
      "tris-asc": (a, b) => (a.triangles < 0) - (b.triangles < 0) || a.triangles - b.triangles,
    }[sort];
    return list.sort(order);
  }, [ofType, group, theme, heroKey, size, animated, filter, sort, similar, meaning]);

  // The grid sits under the header in the same scroll: its width sets the columns, its top the
  // virtual list's margin
  const scroller = useRef(null);
  const grid = useRef(null);
  const [width, setWidth] = useState(1000);
  const [top, setTop] = useState(0);
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setWidth(el.clientWidth);
      setTop(el.offsetTop);
    });
    ro.observe(el);
    ro.observe(scroller.current.firstElementChild);
    return () => ro.disconnect();
  }, [ready]);
  const rem = useRem();
  const columns = Math.max(1, Math.floor(width / (CARD_W * rem)));
  const virtual = useVirtualizer({
    count: Math.ceil(shown.length / columns),
    getScrollElement: () => scroller.current,
    estimateSize: () => (CARD_H + 1.25) * rem,
    overscan: 3,
    scrollMargin: top,
  });
  useEffect(() => {
    virtual.measure();
  }, [columns]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [type, group, theme, heroKey, size, animated, filter, sort, similar]);

  const findByMeaning = async () => {
    const words = filter.trim();
    if (!words) return;
    setThinking("Getting ready");
    try {
      const results = await searchByWords(words, {
        onProgress: (share, bytes) =>
          setThinking(`Downloading the words model, once: ${share == null ? `${Math.round(bytes / 1e6)} of about 65 MB` : `${Math.round(share * 100)}%`}`),
      });
      setSimilar({ label: `“${words}”`, rank: new Map(results.map((r, i) => [r.path, i])) });
      setType("");
    } catch (e) {
      setThinking(`Could not search: ${e.message || e}`);
      return;
    }
    setThinking("");
  };

  const pickType = (t) => {
    setType(t);
    setGroup("");
    setTheme("");
    setHeroKey("");
  };
  const active = [
    group && [`${group}`, () => setGroup("")],
    theme && [`${theme}`, () => setTheme("")],
    heroKey && [catalog?.heroByKey.get(heroKey)?.name || heroKey, () => setHeroKey("")],
    size && [SIZES.find(([id]) => id === size)[1], () => setSize("")],
    animated && ["Animated", () => setAnimated(false)],
  ].filter(Boolean);

  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-ink-400">
        {error ? `The list of models could not be loaded: ${error}` : <><LoaderCircle size={18} className="animate-spin" /> Loading models</>}
      </div>
    );
  }

  // The opened card's neighbours in the list, for the arrows
  const at = open ? shown.findIndex((c) => c.key === open.key) : -1;
  const step = (d) => at >= 0 && shown.length && setOpen(shown[(at + d + shown.length) % shown.length]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        <header className="mx-auto max-w-[110rem] px-12 pt-8 pb-5">
          <div className="flex items-end justify-between gap-8">
            <div>
              <h1 className="text-[2rem] leading-none font-semibold tracking-[-0.03em]">3D models</h1>
              <p className="mt-3 text-ink-400">
                {formatCount(shown.length)} of {formatCount(cards.length)}, each a glb with its textures and animations
              </p>
            </div>
            <div className="flex items-center gap-2">
              <label className="glass flex h-10 w-[22rem] items-center gap-3 rounded-full pr-1.5 pl-4">
                {meaning ? <Sparkles size={16} className="shrink-0 text-accent" /> : <Search size={16} className="shrink-0 text-ink-400" />}
                <input
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && meaning && findByMeaning()}
                  placeholder={meaning ? "Say how it looks, then Enter" : "Name or path: rock, pine, courier"}
                  className="min-w-0 flex-1 bg-transparent text-[0.95rem] outline-none placeholder:text-ink-400"
                />
                <button
                  onClick={() => setMeaning(!meaning)}
                  title="Search by how it looks, not by its name"
                  className={`h-7 shrink-0 rounded-full px-2.5 text-[0.8rem] font-medium transition ${meaning ? "bg-accent text-ink-950" : "glass-inset text-ink-300 hover:text-ink-100"}`}
                >
                  By look
                </button>
              </label>
              <button onClick={() => setPicking(true)} className="glass flex h-10 items-center gap-2 rounded-full px-5 text-[0.95rem] text-ink-100 transition hover:bg-white/10">
                <ScanSearch size={17} /> Find by picture
              </button>
            </div>
          </div>
          {thinking && (
            <div className="mt-3 flex items-center justify-end gap-2 text-sm text-ink-400">
              <LoaderCircle size={14} className="animate-spin" /> {thinking}
            </div>
          )}

          <div className="mt-6 flex items-center gap-2.5">
            <div className="glass flex rounded-full p-1">
              {TYPES.map(([t, title]) => {
                const n = t ? cards.filter((c) => c.type === t).length : cards.filter((c) => c.type !== "technical").length;
                if (t && !n) return null;
                return (
                  <button
                    key={t}
                    onClick={() => pickType(t)}
                    className={`rounded-full px-3.5 py-1.5 text-[0.88rem] transition ${type === t ? "bg-white/90 font-medium text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
                  >
                    {title}
                  </button>
                );
              })}
            </div>
            <div className="relative">
              <button
                onClick={() => setFiltersOpen(!filtersOpen)}
                className={`glass flex h-10 items-center gap-2 rounded-full px-5 text-[0.9rem] transition ${filtersOpen || active.length ? "text-ink-100" : "text-ink-300 hover:text-ink-100"}`}
              >
                <SlidersHorizontal size={16} /> Filters
                {active.length > 0 && <span className="rounded-full bg-accent px-1.5 text-[0.7rem] font-semibold text-ink-950">{active.length}</span>}
              </button>
              {filtersOpen && (
                <Filters
                  onClose={() => setFiltersOpen(false)}
                  {...{ size, setSize, animated, setAnimated, heroKey, setHeroKey, heroes, catalog, group, setGroup, groups, theme, setTheme, themes }}
                />
              )}
            </div>
            <Select value={sort} onChange={setSort} options={SORTS} />
            <div className="flex flex-1 flex-wrap items-center gap-2">
              {active.map(([label, clear]) => (
                <button key={label} onClick={clear} className="glass-inset flex h-9 items-center gap-1.5 rounded-full pr-2.5 pl-3.5 text-[0.85rem] text-ink-100 capitalize hover:bg-white/12">
                  {label} <X size={14} className="text-ink-400" />
                </button>
              ))}
            </div>
          </div>

          {similar && (
            <div className="glass mt-5 flex items-center gap-4 rounded-3xl p-2.5 pr-4">
              {similar.picture && <img src={similar.picture} alt="" className="h-14 max-w-28 rounded-xl object-contain" />}
              <div className="flex-1 text-[0.95rem]">Most like {similar.label} first</div>
              <button onClick={() => setSimilar(null)} className="flex items-center gap-1.5 text-[0.9rem] text-ink-400 hover:text-ink-100">
                <X size={15} /> Show all
              </button>
            </div>
          )}
        </header>

        {shown.length === 0 && <div className="p-16 text-center text-ink-400">No model fits these filters. Clear one to see more.</div>}
        <div className="mx-auto max-w-[110rem] px-12 pb-16">
          <div ref={grid} style={{ height: virtual.getTotalSize(), position: "relative" }}>
          {virtual.getVirtualItems().map((line) => (
            <div
              key={line.key}
              className="grid gap-x-4"
              style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${line.start - top}px)`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
            >
              {shown.slice(line.index * columns, line.index * columns + columns).map((c) => (
                <Card key={c.key} c={c} onOpen={() => setOpen(c)} />
              ))}
            </div>
          ))}
          </div>
        </div>
      </div>

      {picking && (
        <ImageSearch
          onClose={() => setPicking(false)}
          onResults={(results, picture) => {
            setPicking(false);
            setType("");
            setSimilar({ label: "your picture", picture, rank: new Map(results.map((r, i) => [r.path, i])) });
          }}
        />
      )}
      {open && <ModelPanel key={open.key} card={open} entries={entries} onClose={() => setOpen(null)} onPrev={() => step(-1)} onNext={() => step(1)} />}
    </div>
  );
}

function Select({ value, onChange, options }) {
  return (
    <label className="glass relative flex h-10 items-center rounded-full pr-9 pl-5 text-[0.9rem] text-ink-300">
      <select value={value} onChange={(e) => onChange(e.target.value)} className="appearance-none bg-transparent outline-none">
        {options.map(([v, t]) => (
          <option key={v} value={v} className="bg-ink-900">
            {t}
          </option>
        ))}
      </select>
      <ChevronDown size={15} className="pointer-events-none absolute right-3.5 text-ink-400" />
    </label>
  );
}

// The filters, in a glass panel under their button
function Filters({ onClose, size, setSize, animated, setAnimated, heroKey, setHeroKey, heroes, catalog, group, setGroup, groups, theme, setTheme, themes }) {
  const panel = useRef(null);
  useEffect(() => {
    const onDown = (e) => !panel.current?.contains(e.target) && !e.target.closest("button")?.textContent.includes("Filters") && onClose();
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);
  const chip = (on) => `rounded-full px-3.5 py-1.5 text-[0.85rem] capitalize transition ${on ? "bg-white/90 text-ink-950" : "glass-inset text-ink-300 hover:text-ink-100"}`;
  return (
    <div ref={panel} className="glass absolute top-full left-0 z-20 mt-3 w-[34rem] space-y-6 rounded-3xl p-6">
      <section>
        <h3 className="mb-2.5 text-[0.85rem] text-ink-400">Size</h3>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map(([id, title]) => (
            <button key={id} onClick={() => setSize(size === id ? "" : id)} className={chip(size === id)}>
              {title}
            </button>
          ))}
          <button onClick={() => setAnimated(!animated)} className={`${chip(animated)} flex items-center gap-1.5`}>
            {animated && <Check size={13} />} Animated
          </button>
        </div>
      </section>
      {heroes.length > 1 && (
        <section>
          <h3 className="mb-2.5 text-[0.85rem] text-ink-400">Hero</h3>
          <select value={heroKey} onChange={(e) => setHeroKey(e.target.value)} className="glass-inset h-10 w-full rounded-xl px-3 text-[0.9rem] text-ink-100 outline-none">
            <option value="" className="bg-ink-900">
              Any hero
            </option>
            {heroes
              .map(([k, n]) => [k, catalog.heroByKey.get(k)?.name || k, n])
              .sort((a, b) => a[1].localeCompare(b[1]))
              .map(([k, name, n]) => (
                <option key={k} value={k} className="bg-ink-900">
                  {name} ({n})
                </option>
              ))}
          </select>
        </section>
      )}
      {groups.length > 1 && <Chips title="Kind" items={groups} value={group} onPick={setGroup} chip={chip} />}
      {themes.length > 0 && <Chips title="Theme" items={themes} value={theme} onPick={setTheme} chip={chip} />}
    </div>
  );
}

function Chips({ title, items, value, onPick, chip }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 14);
  return (
    <section>
      <h3 className="mb-2.5 text-[0.85rem] text-ink-400">{title}</h3>
      <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
        {shown.map(([k, n]) => (
          <button key={k} onClick={() => onPick(value === k ? "" : k)} className={chip(value === k)}>
            {k} <span className="opacity-50">{formatCount(n)}</span>
          </button>
        ))}
        {items.length > 14 && (
          <button onClick={() => setAll(!all)} className="px-2 text-[0.85rem] text-ink-400 hover:text-ink-100">
            {all ? "Fewer" : `${items.length - 14} more`}
          </button>
        )}
      </div>
    </section>
  );
}

// A model standing in its own light: no frame, the picture large, the name under it
function Card({ c, onOpen }) {
  const [broken, setBroken] = useState(false);
  return (
    <div onClick={onOpen} style={{ height: `${CARD_H}rem` }} className="group flex cursor-pointer flex-col">
      <div className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden rounded-3xl bg-[radial-gradient(ellipse_70%_55%_at_50%_58%,#1b2433_0%,#0d1118_60%,transparent_100%)] transition duration-300 group-hover:bg-[radial-gradient(ellipse_75%_60%_at_50%_55%,#26334a_0%,#111722_62%,transparent_100%)]">
        <span className="absolute bottom-[14%] h-[6%] w-[46%] rounded-[50%] bg-black/50 blur-md" />
        {c.preview && !broken ? (
          <img
            src={previewUrl(c.first)}
            loading="lazy"
            decoding="async"
            alt=""
            onError={() => setBroken(true)}
            className="relative h-full w-full object-contain p-5 transition duration-500 ease-out group-hover:scale-[1.06]"
          />
        ) : (
          <Box size={34} strokeWidth={1} className="relative text-ink-600" />
        )}
        {c.models.length > 1 && <span className="glass absolute top-3 left-3 rounded-full px-2.5 py-1 text-[0.72rem] text-ink-100">{c.models.length} variants</span>}
        <a
          href={fileUrl(datasetById(c.first.ds), c.first.path, true)}
          onClick={(ev) => ev.stopPropagation()}
          title="Download the glb"
          className="glass absolute top-3 right-3 flex h-9 w-9 items-center justify-center rounded-full text-ink-100 opacity-0 transition group-hover:opacity-100"
        >
          <Download size={16} />
        </a>
      </div>
      <div className="shrink-0 px-1 pt-3 leading-tight">
        <div className="truncate text-[0.98rem] font-medium capitalize">{c.name}</div>
        <div className="mt-1 truncate text-[0.82rem] text-ink-400 capitalize">{c.heroName || c.group || c.type}</div>
      </div>
    </div>
  );
}
