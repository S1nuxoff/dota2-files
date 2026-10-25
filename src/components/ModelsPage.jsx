import { useEffect, useMemo, useRef, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Box, Check, ChevronDown, Download, LoaderCircle, ScanSearch, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { SIZES, loadModels, sizeOf } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import { useRem } from "../lib/scale.js";
import ModelPanel from "./ModelPanel.jsx";
import { Button, Card, Chip, PageHead, SearchField, Spinner, Dropdown } from "./ui.jsx";
import ImageSearch from "./ImageSearch.jsx";
import HeroPicker from "./HeroPicker.jsx";
import { searchByWords } from "../lib/visual.js";

// The narrowest a card gets, in rem (lib/scale.js)
const CARD_W = 15;

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
    // by name, forgiving typos (lib/smart.js); not while searching by a picture or by meaning
    const match = similar || meaning ? null : fuzzyMatch(cards, (c) => c.hay, filter);
    const list = ofType.filter(
      (c) =>
        (!group || c.group === group) &&
        (!theme || c.theme === theme) &&
        (!heroKey || c.hero === heroKey) &&
        (!size || c.size === size) &&
        (!animated || c.animated) &&
        (!match || match.has(c))
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
  const gap = 1.25 * rem;
  const columns = Math.max(1, Math.floor((width + gap) / (CARD_W * rem + gap)));
  const cardWidth = (width - gap * (columns - 1)) / columns;
  // A card: its picture (4 : 3.4) and the two lines under it
  const rowHeight = cardWidth * (3.4 / 4) + 4.1 * rem + gap;
  const virtual = useVirtualizer({
    count: Math.ceil(shown.length / columns),
    getScrollElement: () => scroller.current,
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin: top,
  });
  useEffect(() => {
    virtual.measure();
  }, [columns, rowHeight]); // eslint-disable-line react-hooks/exhaustive-deps
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

  if (!ready) return error ? <div className="p-16 text-center text-ink-400">The list of models could not be loaded: {error}</div> : <Spinner text="Loading models" />;

  // The opened card's neighbours in the list, for the arrows
  const at = open ? shown.findIndex((c) => c.key === open.key) : -1;
  const step = (d) => at >= 0 && shown.length && setOpen(shown[(at + d + shown.length) % shown.length]);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {/* Above the grid, so the filters' panel opens over the cards */}
        <div className="anim-page relative z-20">
          <PageHead title="3D models" sub={`${formatCount(cards.length)} models of Dota 2, each a glb with its textures and animations.`}>
            <SearchField
              value={filter}
              onChange={setFilter}
              onEnter={() => meaning && findByMeaning()}
              icon={meaning ? Sparkles : Search}
              placeholder={meaning ? "Say how it looks, then press Enter" : "Search by name or path"}
              right={
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setMeaning(!meaning)}
                    title="Search by how it looks, not by its name"
                    className={`h-8 rounded-lg px-3 text-[0.82rem] transition-colors ${meaning ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-ink-800 hover:text-ink-100"}`}
                  >
                    By look
                  </button>
                  <button
                    onClick={() => setPicking(true)}
                    title="Find by a screenshot"
                    className="flex h-8 items-center gap-1.5 rounded-lg px-3 text-[0.82rem] text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100"
                  >
                    <ScanSearch size={15} /> Picture
                  </button>
                </div>
              }
            />
            {thinking && (
              <div className="flex items-center gap-2 text-sm text-ink-400">
                <LoaderCircle size={14} className="animate-spin" /> {thinking}
              </div>
            )}
            <div className="flex flex-wrap justify-center gap-2">
              {TYPES.map(([t, title]) => {
                const n = t ? cards.filter((c) => c.type === t).length : 0;
                if (t && !n) return null;
                return (
                  <Chip key={t} active={type === t} onClick={() => pickType(t)}>
                    {title}
                  </Chip>
                );
              })}
            </div>
          </PageHead>

          <div className="mx-auto max-w-[128rem] px-8">
            <div className="flex items-center gap-2 pb-5">
              <div className="relative">
                <Button onClick={() => setFiltersOpen(!filtersOpen)}>
                  <SlidersHorizontal size={16} /> Filters
                  {active.length > 0 && <span className="rounded bg-ink-100 px-1.5 text-[0.7rem] font-semibold text-ink-950">{active.length}</span>}
                </Button>
                {filtersOpen && (
                  <Filters
                    onClose={() => setFiltersOpen(false)}
                    {...{ size, setSize, animated, setAnimated, heroKey, setHeroKey, heroes, catalog, group, setGroup, groups, theme, setTheme, themes }}
                  />
                )}
              </div>
              {active.map(([label, clear]) => (
                <button key={label} onClick={clear} className="anim-fade flex h-10 items-center gap-1.5 rounded-lg bg-ink-800 pr-2.5 pl-3.5 text-[0.86rem] capitalize transition-colors hover:bg-ink-700">
                  {label} <X size={14} className="text-ink-400" />
                </button>
              ))}
              <div className="flex-1 pl-2 text-[0.88rem] text-ink-400">
                {similar ? (
                  <span className="anim-fade inline-flex items-center gap-3">
                    {similar.picture && <img src={similar.picture} alt="" className="h-9 max-w-16 rounded-md object-contain" />}
                    Most like {similar.label} first
                    <button onClick={() => setSimilar(null)} className="text-ink-100 hover:underline">
                      Show all
                    </button>
                  </span>
                ) : (
                  `${formatCount(shown.length)} shown`
                )}
              </div>
              <Select value={sort} onChange={setSort} options={SORTS} />
            </div>
          </div>
        </div>

        {shown.length === 0 && <div className="p-16 text-center text-ink-400">No model fits these filters. Clear one to see more.</div>}
        <div className="mx-auto max-w-[128rem] px-8 pb-16">
          <div ref={grid} style={{ height: virtual.getTotalSize(), position: "relative" }}>
            {virtual.getVirtualItems().map((line) => (
              <div
                key={line.key}
                className="grid"
                style={{ position: "absolute", top: 0, left: 0, right: 0, columnGap: gap, transform: `translateY(${line.start - top}px)`, gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
              >
                {shown.slice(line.index * columns, line.index * columns + columns).map((c, i) => (
                  <ModelCard key={c.key} c={c} delay={i * 45} onOpen={() => setOpen(c)} />
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
  return <Dropdown value={value} onChange={onChange} options={options} />;
}

// The filters, in a panel under their button
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
  return (
    <div ref={panel} className="anim-open absolute top-full left-0 z-20 mt-2 w-[32rem] space-y-6 rounded-2xl border border-white/[0.08] bg-ink-900 p-5 shadow-2xl shadow-black/50">
      <section>
        <h3 className="mb-2.5 text-[0.84rem] text-ink-400">Size</h3>
        <div className="flex flex-wrap gap-1.5">
          {SIZES.map(([id, title]) => (
            <Chip key={id} active={size === id} onClick={() => setSize(size === id ? "" : id)}>
              {title}
            </Chip>
          ))}
          <Chip active={animated} onClick={() => setAnimated(!animated)} className="flex items-center gap-1.5">
            {animated && <Check size={13} />} Animated
          </Chip>
        </div>
      </section>
      {heroes.length > 1 && (
        <section>
          <h3 className="mb-2.5 text-[0.84rem] text-ink-400">Hero</h3>
          <HeroPicker
            heroes={heroes
              .map(([k, n]) => ({ hero: catalog.heroByKey.get(k), count: n }))
              .filter((h) => h.hero)
              .sort((a, b) => a.hero.name.localeCompare(b.hero.name))}
            value={heroKey}
            onChange={setHeroKey}
            className="[&>button]:w-full"
          />
        </section>
      )}
      {groups.length > 1 && <Chips title="Kind" items={groups} value={group} onPick={setGroup} />}
      {themes.length > 0 && <Chips title="Theme" items={themes} value={theme} onPick={setTheme} />}
    </div>
  );
}

function Chips({ title, items, value, onPick }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 14);
  return (
    <section>
      <h3 className="mb-2.5 text-[0.84rem] text-ink-400">{title}</h3>
      <div className="flex max-h-56 flex-wrap gap-1.5 overflow-y-auto">
        {shown.map(([k, n]) => (
          <Chip key={k} active={value === k} onClick={() => onPick(value === k ? "" : k)} className="capitalize">
            {k} <span className="opacity-50">{formatCount(n)}</span>
          </Chip>
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

function ModelCard({ c, delay, onOpen }) {
  const [broken, setBroken] = useState(false);
  return (
    <div className="anim-card" style={{ animationDelay: `${delay}ms` }}>
      <Card
        onClick={onOpen}
        title={<span className="capitalize">{c.name}</span>}
        meta={<span className="capitalize">{[c.heroName || c.group || c.type, c.models.length > 1 && `${c.models.length} variants`].filter(Boolean).join("   ")}</span>}
        action={
          <a
            href={fileUrl(datasetById(c.first.ds), c.first.path, true)}
            onClick={(ev) => ev.stopPropagation()}
            title="Download the glb"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/55 text-ink-100 backdrop-blur hover:bg-black/75"
          >
            <Download size={16} />
          </a>
        }
        picture={
          c.preview && !broken ? (
            <img
              src={previewUrl(c.first)}
              loading="lazy"
              decoding="async"
              alt=""
              onError={() => setBroken(true)}
              className="h-full w-full object-contain p-6 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Box size={34} strokeWidth={1} className="text-ink-600" />
            </div>
          )
        }
      />
    </div>
  );
}
