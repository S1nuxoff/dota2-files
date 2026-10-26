import { useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Box, ClockFading, CornerDownLeft, FolderOpen, Gem, Gift, Layers, Music, Package, Search, Shirt, Sparkles, Users, X, Sticker } from "lucide-react";
import { DATASETS, DOTADEX } from "../datasets.js";
import { imageUrl, prefabTitle } from "../lib/catalog.js";
import { searchNames } from "../lib/smart.js";
import { link, navigate, openItem } from "../lib/route.js";
import { closePalette, openPalette, rememberSearch, recentSearches, usePalette } from "../lib/palette.js";
import { heroIcon } from "./HeroPicker.jsx";

// The places of the site, to jump to by name
const PLACES = [
  ["/heroes", "Heroes", Users, "Every hero with its models, items and sounds"],
  ["/cosmetics", "Cosmetics", Gem, "Everything a player can own, by kind"],
  ["/sets", "Sets", Shirt, "Every set on its hero"],
  ["/bundles", "Bundles", Package, "Items sold as one"],
  ["/cosmetics/treasures", "Treasures", Gift, "Chests and what drops from them"],
  ["/cosmetics/capsules", "Capsules", Sticker, "Sticker capsules and the stickers inside"],
  ["/music", "Music", Music, "Every music pack, to play and download"],
  ["/3d", "3D Models", Box, "Every model, by type, theme and size"],
  ["/files", "Files", FolderOpen, "The raw datasets by folder"],
  [DOTADEX, "Dotadex", Sparkles, "Heroes and items as the game shows them, in 3D"],
  ...DATASETS.map((d) => [`/${d.id}`, `${d.title} dataset`, d.icon || Layers, d.blurb]),
];

// Search over everything, in a window over the page: heroes, sets, items and places by name as you
// type (typos forgiven), the arrows to move, Enter to open; the last row searches every file
export default function CommandPalette({ catalog }) {
  const { open, query } = usePalette();
  // Ctrl+K (Cmd+K) anywhere, or "/" outside a field
  useEffect(() => {
    const onKey = (e) => {
      const typing = ["INPUT", "TEXTAREA", "SELECT"].includes(document.activeElement?.tagName);
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        open ? closePalette() : openPalette();
      } else if (e.key === "/" && !typing && !open) {
        e.preventDefault();
        openPalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);
  if (!open) return null;
  return <Palette initial={query} catalog={catalog} />;
}

function Palette({ initial, catalog }) {
  const [text, setText] = useState(initial);
  const q = useDeferredValue(text.trim());
  const [active, setActive] = useState(0);
  const input = useRef(null);
  const list = useRef(null);
  useEffect(() => {
    input.current?.focus();
    input.current?.select();
  }, []);

  const rows = useMemo(() => {
    const out = [];
    const everything = (query) => ({
      key: `all:${query}`,
      group: "Everything",
      icon: Search,
      title: `All results for “${query}”`,
      meta: "Heroes, items and every file of the eight datasets",
      run: () => navigate({ ds: "all", q: query }),
    });
    if (!q) {
      for (const r of recentSearches()) out.push({ ...everything(r), key: `recent:${r}`, group: "Recent", icon: ClockFading, title: r, meta: "" });
      for (const [path, title, icon, meta] of PLACES.slice(0, 9)) out.push({ key: path, group: "Go to", icon, title, meta, run: () => go(path) });
      return out;
    }
    if (catalog) {
      const found = searchNames(catalog, q);
      for (const h of found.heroes.slice(0, 4))
        out.push({ key: `h:${h.id}`, group: "Heroes", picture: heroIcon(h), title: h.name, meta: `${h.items.length} items${h.about?.attribute ? `, ${h.about.attribute}` : ""}`, run: () => navigate({ ds: "hero", dir: h.key }) });
      for (const s of found.sets.slice(0, 4))
        out.push({ key: `s:${s.key}`, group: "Sets", picture: imageUrl(s.icon), tall: true, title: s.name, meta: `${s.hero ? `${s.hero.name}, ` : ""}${s.items.length} items`, run: () => navigate({ ds: "set", dir: s.key }) });
      const items = found.items.slice(0, 7);
      for (const i of items) {
        const hero = i.heroes.map((id) => catalog.heroById.get(id)).find(Boolean);
        out.push({
          key: `i:${i.id}`,
          group: "Items",
          picture: imageUrl(i.icon),
          rarity: catalog.rarities[i.rarity || "common"]?.color,
          title: i.name,
          meta: [i.type || i.slot || prefabTitle(i.prefab), hero?.name].filter(Boolean).join(", "),
          run: () => openItem(i.id, items.map((x) => x.id)),
        });
      }
    }
    const words = q.toLowerCase().split(/\s+/);
    for (const [path, title, icon, meta] of PLACES) if (words.every((w) => title.toLowerCase().includes(w))) out.push({ key: path, group: "Go to", icon, title, meta, run: () => go(path) });
    out.push(everything(q));
    return out;
  }, [q, catalog]);

  useEffect(() => setActive(0), [q]);
  useEffect(() => {
    list.current?.querySelector(`[data-row="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const run = (row) => {
    if (!row) return;
    if (q) rememberSearch(row.group === "Recent" ? row.title : q);
    closePalette();
    row.run();
  };
  const onKey = (e) => {
    if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => (a + 1) % rows.length));
    else if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => (a - 1 + rows.length) % rows.length));
    else if (e.key === "Enter") (e.preventDefault(), run(rows[active]));
    else if (e.key === "Escape") (e.preventDefault(), closePalette());
  };

  let lastGroup = "";
  return (
    <div data-lock className="anim-fade fixed inset-0 z-50 bg-black/65 backdrop-blur-[3px]" onClick={closePalette} role="dialog" aria-modal="true" aria-label="Search">
      <div
        onClick={(e) => e.stopPropagation()}
        className="anim-open absolute inset-0 flex flex-col overflow-hidden bg-ink-900 md:inset-x-0 md:top-[11vh] md:bottom-auto md:mx-auto md:max-h-[72vh] md:w-[42rem] md:rounded-2xl md:border md:border-white/[0.09] md:shadow-[0_40px_120px_-30px_rgb(0_0_0/0.95)]"
      >
        <div className="flex items-center gap-3 border-b border-white/[0.07] pt-[env(safe-area-inset-top)] pr-3 pl-4 md:pr-4 md:pl-5">
          <Search size={19} className="shrink-0 text-ink-400" />
          <input
            ref={input}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={onKey}
            placeholder="Search heroes, sets, items, files"
            enterKeyHint="search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={rows[active] ? `palette-${active}` : undefined}
            className="h-14 min-w-0 flex-1 bg-transparent text-[1.05rem] outline-none placeholder:text-ink-500"
          />
          {text && (
            <button onClick={() => (setText(""), input.current?.focus())} aria-label="Clear" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-800 hover:text-ink-100">
              <X size={16} />
            </button>
          )}
          <button onClick={closePalette} className="h-8 rounded-lg px-2.5 text-[0.86rem] text-ink-300 hover:bg-ink-800 md:hidden">
            Cancel
          </button>
          <kbd className="hidden rounded-md border border-white/10 px-1.5 py-0.5 font-sans text-[0.7rem] text-ink-400 md:block">Esc</kbd>
        </div>

        <div ref={list} id="palette-list" role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
          {q && !catalog && <div className="px-3 py-2 text-[0.84rem] text-ink-500">Loading names of heroes and items…</div>}
          {rows.map((row, i) => {
            const head = row.group !== lastGroup;
            lastGroup = row.group;
            const Icon = row.icon;
            return (
              <div key={row.key}>
                {head && <div className="px-3 pt-3 pb-1.5 text-[0.74rem] font-medium tracking-[0.02em] text-ink-500">{row.group}</div>}
                <button
                  id={`palette-${i}`}
                  data-row={i}
                  role="option"
                  aria-selected={i === active}
                  onMouseMove={() => setActive(i)}
                  onClick={() => run(row)}
                  className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors ${i === active ? "bg-white/[0.07]" : ""}`}
                >
                  <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-ink-800 ${row.tall ? "h-11 w-8" : "h-9 w-9"}`}>
                    {row.picture ? <img src={row.picture} alt="" loading="lazy" className="h-full w-full object-cover" /> : Icon && <Icon size={16} className="text-ink-300" />}
                    {row.rarity && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: row.rarity }} />}
                  </span>
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[0.93rem]">{row.title}</span>
                    {row.meta && <span className="mt-0.5 block truncate text-[0.8rem] text-ink-400">{row.meta}</span>}
                  </span>
                  {i === active && <CornerDownLeft size={15} className="hidden shrink-0 text-ink-400 md:block" />}
                  {i !== active && row.group === "Everything" && <ArrowRight size={15} className="shrink-0 text-ink-500" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="hidden items-center gap-4 border-t border-white/[0.06] px-5 py-2.5 text-[0.76rem] text-ink-500 md:flex">
          <span>
            <kbd className="font-sans text-ink-300">↑↓</kbd> to move
          </span>
          <span>
            <kbd className="font-sans text-ink-300">Enter</kbd> to open
          </span>
          <span className="flex-1" />
          <a href={link("/files")} onClick={closePalette} className="hover:text-ink-200">
            Browse every file by folder
          </a>
        </div>
      </div>
    </div>
  );
}

// A place: a page of the site, or another site in a new tab
const go = (path) => (path.startsWith("http") ? window.open(path, "_blank", "noopener") : navigate(routeOf(path)));

// A place's path as a route
function routeOf(path) {
  const [ds = "", ...rest] = path.replace(/^\/+/, "").split("/");
  return { ds, dir: rest.join("/") };
}
