import { useDeferredValue, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { Box, Check, ChevronDown, Download, LoaderCircle, ScanSearch, Search, SlidersHorizontal, Sparkles, X } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { SIZES, loadModels, sizeOf } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import { useRem } from "../lib/scale.js";
import ModelPanel from "./ModelPanel.jsx";
import { Button, Card, Chip, Empty, Page, PageHead, SearchField, Segmented, Sheet, Spinner, Dropdown, Toolbar, LoadingList } from "./ui.jsx";
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
const collator = new Intl.Collator("en", { numeric: true });
const ORDERS = {
  name: (a, b) => collator.compare(a.name, b.name),
  "size-desc": (a, b) => longest(b) - longest(a),
  "size-asc": (a, b) => (longest(a) < 0) - (longest(b) < 0) || longest(a) - longest(b),
  "tris-desc": (a, b) => b.triangles - a.triangles,
  "tris-asc": (a, b) => (a.triangles < 0) - (b.triangles < 0) || a.triangles - b.triangles,
};

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

  // In the chosen order once: the filters below keep it, so typing does not sort thousands again
  const ofType = useMemo(() => cards.filter((c) => (type ? c.type === type : c.type !== "technical")).sort(ORDERS[sort]), [cards, type, sort]);
  // The list follows the typing a moment behind, so the field never waits for it
  const query = useDeferredValue(filter);
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
    const match = similar || meaning ? null : fuzzyMatch(cards, (c) => c.hay, query);
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
    return list;
  }, [ofType, group, theme, heroKey, size, animated, query, similar, meaning]);

  // The grid sits under the header in the same scroll: its width sets the columns, its top the
  // virtual list's margin
  const grid = useRef(null);
  const [width, setWidth] = useState(1000);
  const [top, setTop] = useState(0);
  useLayoutEffect(() => {
    const el = grid.current;
    if (!el) return;
    const update = () => {
      setWidth(el.clientWidth);
      setTop(el.getBoundingClientRect().top + window.scrollY);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [ready]);
  const rem = useRem();
  const gap = (width < 640 ? 0.75 : 1) * rem;
  const columns = Math.max(2, Math.floor((width + gap) / (CARD_W * rem + gap)));
  const cardWidth = (width - gap * (columns - 1)) / columns;
  // A card: its picture (4 : 3.4) and the two lines under it
  const rowHeight = cardWidth * (3.4 / 4) + 4 * rem + gap;
  const virtual = useWindowVirtualizer({
    count: Math.ceil(shown.length / columns),
    estimateSize: () => rowHeight,
    overscan: 3,
    scrollMargin: top,
  });
  useEffect(() => {
    virtual.measure();
  }, [columns, rowHeight]); // eslint-disable-line react-hooks/exhaustive-deps
  // A new filter shows its list from the top (the filters staying in view, stuck under the bar)
  const first = useRef(true);
  useEffect(() => {
    if (first.current) return void (first.current = false);
    if (window.scrollY > top - 130) window.scrollTo({ top: Math.max(0, top - 130) });
  }, [type, group, theme, heroKey, size, animated, query, sort, similar]); // eslint-disable-line react-hooks/exhaustive-deps

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

  if (!ready) return error ? <Page><Empty title="The list of models could not be loaded" text={error} /></Page> : <LoadingList title="3D Models" />;

  // The opened card's neighbours in the list, for the arrows
  const at = open ? shown.findIndex((c) => c.key === open.key) : -1;
  const step = (d) => at >= 0 && shown.length && setOpen(shown[(at + d + shown.length) % shown.length]);

  const typeItems = TYPES.filter(([t]) => !t || cards.some((c) => c.type === t)).map(([t, title]) => [t, title]);
  return (
    <Page>
      <PageHead
        title="3D Models"
        sub="Every model of Dota 2 as glb with its textures and animations. Find one by name, by how it looks, or by a screenshot from the game."
        search={
          <SearchField
            value={filter}
            onChange={setFilter}
            onEnter={() => meaning && findByMeaning()}
            icon={meaning ? Sparkles : Search}
            placeholder={meaning ? "Say how it looks, then press Enter" : `Search ${formatCount(cards.length)} models by name or path`}
            big
            right={
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setMeaning(!meaning)}
                  title="Search by how it looks, not by its name"
                  aria-pressed={meaning}
                  className={`h-7 rounded-lg px-2.5 text-[0.8rem] transition-colors ${meaning ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-ink-800 hover:text-ink-100"}`}
                >
                  By look
                </button>
                <button onClick={() => setPicking(true)} title="Find by a screenshot" className="flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[0.8rem] text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100">
                  <ScanSearch size={15} /> <span className="max-xs:hidden">Picture</span>
                </button>
              </div>
            }
          />
        }
      />
      <Toolbar>
        <Segmented label="Type" value={type} onChange={pickType} items={typeItems} className="max-w-full" />
        <div className="flex items-center gap-2 max-md:w-full">
          <Button onClick={() => setFiltersOpen(true)} className="max-md:flex-1">
            <SlidersHorizontal size={16} /> Filters
            {active.length > 0 && <span className="rounded-md bg-ink-100 px-1.5 text-[0.7rem] font-semibold text-ink-950">{active.length}</span>}
          </Button>
          <Dropdown value={sort} onChange={setSort} options={SORTS} label="Sort" className="max-md:flex-1" />
        </div>
      </Toolbar>

      <div className="page-x pt-4">
        {(thinking || active.length > 0 || similar) && (
          <div className="mb-5 flex flex-wrap items-center gap-2 text-[0.86rem] text-ink-400">
            {thinking && (
              <span className="flex items-center gap-2">
                <LoaderCircle size={14} className="animate-spin" /> {thinking}
              </span>
            )}
            {active.map(([label, clear]) => (
              <button key={label} onClick={clear} className="anim-fade flex h-8 items-center gap-1.5 rounded-lg border border-white/[0.07] bg-ink-850 pr-2 pl-3 text-[0.84rem] text-ink-200 capitalize transition-colors hover:border-white/[0.16]">
                {label} <X size={13} className="text-ink-400" />
              </button>
            ))}
            {similar && (
              <span className="anim-fade inline-flex items-center gap-3">
                {similar.picture && <img src={similar.picture} alt="" className="h-9 max-w-16 rounded-md object-contain" />}
                Most like {similar.label} first
                <button onClick={() => setSimilar(null)} className="text-ink-100 hover:underline">
                  Show all
                </button>
              </span>
            )}
            <span className="ml-auto tabular-nums">{formatCount(shown.length)} shown</span>
          </div>
        )}
        {shown.length === 0 && <Empty title="No model fits these filters" text="Clear one to see more." />}
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

      {filtersOpen && (
        <Filters
          onClose={() => setFiltersOpen(false)}
          count={shown.length}
          clearAll={() => (setGroup(""), setTheme(""), setHeroKey(""), setSize(""), setAnimated(false))}
          {...{ size, setSize, animated, setAnimated, heroKey, setHeroKey, heroes, catalog, group, setGroup, groups, theme, setTheme, themes }}
        />
      )}
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
    </Page>
  );
}

function Select({ value, onChange, options }) {
  return <Dropdown value={value} onChange={onChange} options={options} />;
}

// The filters, in a sheet: from the right on a large screen, from the bottom on a phone
function Filters({ onClose, count, clearAll, size, setSize, animated, setAnimated, heroKey, setHeroKey, heroes, catalog, group, setGroup, groups, theme, setTheme, themes }) {
  return (
    <Sheet
      title="Filters"
      onClose={onClose}
      footer={
        <div className="flex gap-2">
          <Button onClick={clearAll} className="flex-1">
            Clear all
          </Button>
          <Button primary onClick={onClose} className="flex-1">
            Show {formatCount(count)}
          </Button>
        </div>
      }
    >
      <div className="space-y-7">
        <section>
          <h3 className="mb-2.5 text-[0.82rem] font-medium text-ink-400">Size</h3>
          <div className="flex flex-wrap gap-1.5">
            {SIZES.map(([id, title]) => (
              <Chip key={id} active={size === id} onClick={() => setSize(size === id ? "" : id)}>
                {title}
              </Chip>
            ))}
            <Chip active={animated} onClick={() => setAnimated(!animated)} className="gap-1.5">
              {animated && <Check size={13} />} Animated
            </Chip>
          </div>
        </section>
        {heroes.length > 1 && (
          <section>
            <h3 className="mb-2.5 text-[0.82rem] font-medium text-ink-400">Hero</h3>
            <HeroPicker
              heroes={heroes
                .map(([k, n]) => ({ hero: catalog.heroByKey.get(k), count: n }))
                .filter((h) => h.hero)
                .sort((a, b) => a.hero.name.localeCompare(b.hero.name))}
              value={heroKey}
              onChange={setHeroKey}
              className="[&>button]:w-full [&>div]:left-0 [&>div]:w-full"
            />
          </section>
        )}
        {groups.length > 1 && <Chips title="Kind" items={groups} value={group} onPick={setGroup} />}
        {themes.length > 0 && <Chips title="Theme" items={themes} value={theme} onPick={setTheme} />}
      </div>
    </Sheet>
  );
}

function Chips({ title, items, value, onPick }) {
  const [all, setAll] = useState(false);
  const shown = all ? items : items.slice(0, 14);
  return (
    <section>
      <h3 className="mb-2.5 text-[0.82rem] font-medium text-ink-400">{title}</h3>
      <div className="flex flex-wrap gap-1.5">
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
