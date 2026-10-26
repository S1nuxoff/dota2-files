import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowUpRight, Box, Code, Database, FolderOpen, Gem, Heart, Map as MapIcon, ScrollText, Search, Users } from "lucide-react";
import { link } from "../lib/route.js";
import { DOTADEX, datasetById } from "../datasets.js";
import { openPalette } from "../lib/palette.js";

export const SOURCE_URL = "https://github.com/S1nuxoff/dota2-files";
export const DATASETS_URL = "https://huggingface.co/Sqls1";
export const SUPPORT_URL = "https://ko-fi.com/s1nuxoff";

// The site's parts. Sets, bundles, treasures and music are kinds of cosmetics: they live under it
const COSMETIC = new Set(["cosmetics", "item", "set", "sets", "bundles", "music"]);
export const SECTIONS = [
  ["/heroes", "Heroes", Users, (r) => r.ds === "heroes" || r.ds === "hero"],
  ["/cosmetics", "Cosmetics", Gem, (r) => COSMETIC.has(r.ds)],
  ["/3d", "3D Models", Box, (r) => r.ds === "3d"],
  ["/map", "Map", MapIcon, (r) => r.ds === "map"],
  ["/patches", "Patches", ScrollText, (r) => r.ds === "patches"],
  ["/files", "Files", FolderOpen, (r) => r.ds === "files" || r.ds === "all" || !!datasetById(r.ds)],
];

const MAC = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);
export const SEARCH_KEY = MAC ? "⌘K" : "Ctrl K";

// The page has scrolled away from its top: the bars take a background of their own
function useScrolled() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);
  return scrolled;
}

// The two sides of the bar as wide as the wider of them, so the search between them stands in the
// middle; where that leaves it less than 13rem, the search is the button on the right instead
function useCentred() {
  const nav = useRef(null);
  const left = useRef(null);
  const right = useRef(null);
  const [layout, setLayout] = useState({ side: 0, fits: true });
  useLayoutEffect(() => {
    const wide = matchMedia("(min-width: 80rem)");
    const measure = () => {
      let next = { side: 0, fits: true };
      if (wide.matches) {
        const style = getComputedStyle(nav.current);
        const side = Math.ceil(Math.max(left.current.offsetWidth, right.current.offsetWidth));
        const room = nav.current.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight) - 2 * side - 2 * parseFloat(style.columnGap);
        const fits = room >= 13 * parseFloat(getComputedStyle(document.documentElement).fontSize);
        next = { side: fits ? side : 0, fits };
      }
      setLayout((l) => (l.side === next.side && l.fits === next.fits ? l : next));
    };
    const ro = new ResizeObserver(measure);
    for (const r of [nav, left, right]) ro.observe(r.current);
    wide.addEventListener("change", measure);
    measure();
    return () => {
      ro.disconnect();
      wide.removeEventListener("change", measure);
    };
  }, []);
  return { nav, left, right, ...layout };
}

// The site's bar: the mark and the parts on the left, the search over everything in the middle,
// the links out on the right; translucent once the page scrolls, so the page's light shows through.
// On a phone the parts move to the bar at the bottom (MobileNav)
export default function TopBar({ route }) {
  const scrolled = useScrolled();
  const home = !route.ds;
  const { nav, left, right, side, fits } = useCentred();
  const sideStyle = side ? { minWidth: side } : undefined;
  return (
    <header
      style={{ viewTransitionName: "topbar" }}
      className={`fixed inset-x-0 top-0 z-30 border-b transition-[background-color,border-color] duration-300 ${
        scrolled ? "border-white/[0.05] bg-ink-950/55 backdrop-blur-xl" : "border-transparent bg-transparent"
      }`}
    >
      <nav ref={nav} aria-label="Main" className="page-x flex h-14 items-center gap-3 md:gap-5 xl:gap-8">
        <div className="flex shrink-0 xl:flex-1 xl:basis-0" style={sideStyle}>
        <div ref={left} className="flex shrink-0 items-center gap-3 md:gap-5 xl:gap-8">
          <a href={link("/")} className="flex shrink-0 items-center py-2" aria-label="Dotadex Files, home">
            <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dotadex" width="875" height="113" className="h-3.5 w-auto" />
            <span className="ml-2.5 hidden text-[0.86rem] font-medium text-ink-400 sm:inline">Files</span>
          </a>
          <ul className="hidden items-center gap-0.5 md:flex">
            {SECTIONS.map(([path, title, , on]) => {
              const active = on(route);
              return (
                <li key={path}>
                  <a
                    href={link(path)}
                    aria-current={active ? "page" : undefined}
                    className={`relative flex h-8 items-center rounded-lg px-2.5 text-[0.9rem] whitespace-nowrap transition-colors xl:px-3 ${active ? "text-ink-100" : "text-ink-400 hover:bg-white/[0.05] hover:text-ink-100"}`}
                  >
                    {title}
                    {active && <span aria-hidden="true" className="absolute inset-x-2.5 -bottom-[0.6rem] xl:inset-x-3 h-px bg-gradient-to-r from-transparent via-ink-100/70 to-transparent" />}
                  </a>
                </li>
              );
            })}
            <li className="hidden min-[112rem]:block">
              <a href={DOTADEX} target="_blank" rel="noreferrer" title="Heroes and items as the game shows them" className="flex h-8 items-center gap-1 rounded-lg px-3 text-[0.9rem] text-ink-400 transition-colors hover:bg-white/[0.05] hover:text-ink-100">
                Dotadex <ArrowUpRight size={13} className="text-ember" />
              </a>
            </li>
          </ul>
        </div>
        </div>
        {/* the search in the middle of the bar: the two sides grow alike, so it stands centred while the
            parts leave room, and narrows (never closer than the gap) when they do not; a button on the
            right on a smaller screen. The front page has its own large search */}
        <div className={`flex min-w-0 flex-1 justify-center ${fits ? "xl:w-[24rem] xl:flex-none xl:shrink" : ""}`}>
          {!home && (
          <button
            onClick={() => openPalette()}
            className={`hidden h-9 w-full max-w-[26rem] items-center gap-2.5 rounded-xl border border-white/[0.08] bg-white/[0.04] pr-2 pl-3 text-[0.88rem] text-ink-500 backdrop-blur-xl transition-colors hover:border-white/[0.16] hover:bg-white/[0.07] hover:text-ink-300 ${fits ? "xl:flex" : ""}`}
          >
            <Search size={15} className="text-ink-400" />
            <span className="flex-1 text-left">Search everything</span>
            <kbd className="rounded-md border border-white/10 px-1.5 py-0.5 font-sans text-[0.7rem] text-ink-400">{SEARCH_KEY}</kbd>
          </button>
          )}
        </div>
        <div className="flex justify-end xl:flex-1 xl:basis-0" style={sideStyle}>
        <div ref={right} className="flex shrink-0 items-center gap-1">
          <div className="hidden items-center gap-1 lg:flex">
            <a href={DATASETS_URL} target="_blank" rel="noreferrer" title="The Hugging Face datasets every file comes from" aria-label="Datasets on Hugging Face" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.05] hover:text-ink-100">
              <Database size={16} />
            </a>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" title="This site's source code on GitHub" aria-label="Source on GitHub" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-white/[0.05] hover:text-ink-100">
              <Code size={16} />
            </a>
          </div>
          <a
            href={SUPPORT_URL}
            target="_blank"
            rel="noreferrer"
            title="Support the author on Ko-fi"
            aria-label="Support the author"
            className="group flex h-9 items-center gap-1.5 rounded-xl px-2.5 text-[0.86rem] text-ink-200 transition-colors hover:bg-white/[0.06] sm:border sm:border-white/[0.08] sm:px-3"
          >
            <Heart size={15} className="text-ember transition-transform group-hover:scale-110" />
            <span className="hidden lg:inline">Support</span>
          </a>
          <button onClick={() => openPalette()} aria-label="Search" className={`-mr-1 h-10 w-10 items-center justify-center rounded-xl text-ink-200 transition-colors hover:bg-white/[0.06] ${fits ? "xl:hidden" : ""} ${home ? "hidden" : "flex"}`}>
            <Search size={19} />
          </button>
        </div>
        </div>
      </nav>
    </header>
  );
}

// A phone's bar at the bottom, in reach of the thumb: the parts and the search
export function MobileNav({ route }) {
  return (
    <nav
      aria-label="Sections"
      style={{ viewTransitionName: "mobilenav" }}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.07] bg-ink-950/85 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl md:hidden"
    >
      <ul className="grid h-[4.25rem] grid-cols-7">
        {SECTIONS.map(([path, title, Icon, on]) => {
          const active = on(route);
          return (
            <li key={path}>
              <a href={link(path)} aria-current={active ? "page" : undefined} className={`flex h-full flex-col items-center justify-center gap-1 text-[0.68rem] transition-colors ${active ? "text-ink-100" : "text-ink-500"}`}>
                <Icon size={21} strokeWidth={active ? 2 : 1.6} />
                {title.replace("3D Models", "3D")}
              </a>
            </li>
          );
        })}
        <li>
          <button onClick={() => openPalette()} className="flex h-full w-full flex-col items-center justify-center gap-1 text-[0.68rem] text-ink-500 transition-colors active:text-ink-100">
            <Search size={21} strokeWidth={1.6} />
            Search
          </button>
        </li>
      </ul>
    </nav>
  );
}
