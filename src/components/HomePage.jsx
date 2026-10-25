import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Box,
  CalendarDays,
  Check,
  Code2,
  Copy,
  Database,
  Gift,
  Heart,
  Layers,
  Music,
  Package,
  Search,
  Shirt,
  Users,
} from "lucide-react";
import { DATASETS, DOTADEX, datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { link, navigate } from "../lib/route.js";
import { eventKind, picturesOf } from "./CosmeticsPage.jsx";
import { heroIcon } from "./HeroPicker.jsx";
import ItemCard from "./ItemCard.jsx";
import { heroCard, imageUrl } from "../lib/catalog.js";

const OWNER_URL = "https://huggingface.co/Sqls1";
const SOURCE_URL = "https://github.com/S1nuxoff/dota2-files";
const SUPPORT_URL = "https://ko-fi.com/s1nuxoff";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

// A fine noise, drawn by the browser (an SVG turbulence), laid over the light as grain
const GRAIN = `url("data:image/svg+xml,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="220" height="220"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 1.4 -0.25"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>'
)}")`;

// "3 hours ago", "2 days ago"
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!(s >= 0)) return "";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} minutes ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86400)} days ago`;
}

// The front page: what the site holds and a way into each part of it
export default function HomePage({ catalog, indexes }) {
  const [query, setQuery] = useState("");
  // How far the side heroes are turned: facing the middle, then round with the scroll
  const turns = [useRef(0.55), useRef(-0.55)];
  // Blocks below the opening show as they scroll into view
  const page = useRef(null);
  useEffect(() => {
    const root = page.current;
    if (!root) return;
    const seen = new IntersectionObserver(
      (list) => {
        for (const e of list) if (e.isIntersecting) (e.target.classList.add("is-shown"), seen.unobserve(e.target));
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    const watch = () => root.querySelectorAll("[data-reveal]:not(.is-shown)").forEach((el) => seen.observe(el));
    watch();
    const later = new MutationObserver(watch);
    later.observe(root, { childList: true, subtree: true });
    return () => {
      seen.disconnect();
      later.disconnect();
    };
  }, []);
  const search = () => query.trim() && navigate({ ds: "all", q: query.trim() });

  const stats = useMemo(() => {
    if (!catalog) return null;
    const items = Object.values(catalog.items);
    const files = DATASETS.reduce((n, d) => n + (indexes[d.id]?.entries.filter((e) => !e.copy).length || 0), 0);
    const bytes = DATASETS.reduce((n, d) => n + (indexes[d.id]?.entries.reduce((m, e) => m + (e.copy ? 0 : e.size), 0) || 0), 0);
    const models = indexes.models?.entries.filter((e) => e.ext === "glb" && !e.path.startsWith("previews/")).length || 0;
    const sounds = indexes.sounds?.entries.filter((e) => e.kind === "audio").length || 0;
    return {
      heroes: catalog.heroes.length,
      items: items.length,
      sets: catalog.setByKey.size,
      bundles: items.filter((i) => i.prefab === "bundle").length,
      treasures: items.filter((i) => i.loot).length,
      music: items.filter((i) => i.prefab === "music").length,
      events: Object.keys(catalog.events || {}).length,
      files,
      bytes,
      models,
      sounds,
    };
  }, [catalog, indexes]);

  // A row of heroes as the site renders them: a different few each day
  const lineup = useMemo(() => {
    if (!catalog) return [];
    const withModel = catalog.heroes.filter((h) => h.model);
    const day = Math.floor(Date.now() / 86400000);
    return Array.from({ length: 6 }, (_, i) => withModel[(day * 6 + i * 17) % withModel.length]);
  }, [catalog]);
  const latestEvent = useMemo(() => {
    if (!catalog) return null;
    let best = null;
    for (const item of Object.values(catalog.items)) if (item.event && (!best || (item.date || "") > best.date)) best = { id: item.event, date: item.date || "" };
    return best;
  }, [catalog]);

  // What each part looks like: the site's renders of its latest models
  const art = useMemo(() => {
    if (!catalog) return {};
    const items = Object.values(catalog.items);
    const of = (f) => picturesOf(items.filter(f), catalog);
    return {
      sets: of((i) => i.set && i.prefab === "wearable"),
      bundles: of((i) => i.prefab === "bundle"),
      treasures: of((i) => i.loot && i.prefab !== "sticker_capsule"),
      models: of((i) => i.prefab === "courier" || i.prefab === "ward"),
      cosmetics: of((i) => i.prefab === "courier"),
      events: latestEvent ? of((i) => i.event === latestEvent.id) : [],
      music: items
        .filter((i) => i.prefab === "music" && i.icon)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
        .slice(0, 3)
        .map((i) => imageUrl(i.icon)),
    };
  }, [catalog, latestEvent]);

  const n = (v) => (stats ? formatCount(v) : "…");

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto pt-0"
      onScroll={(e) => {
        const top = e.currentTarget.scrollTop;
        e.currentTarget.style.setProperty("--p", String(Math.min(1, top / 520)));
        turns[0].current = 0.55 + top * 0.006;
        turns[1].current = -0.55 - top * 0.006;
      }}
    >
      <div ref={page}>
        {/* The opening reaches up under the top bar, so its light shows through the bar's blur */}
        <section className="relative flex min-h-[100dvh] flex-col pt-14">
          {/* Light as in the game's menu: the deep red of the Dota mark from above, embers rising from below */}
          <div aria-hidden="true" className="anim-fade pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
            <div className="absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(55%_55%_at_50%_0%,rgba(178,34,24,0.28),rgba(120,20,14,0.10)_45%,transparent_75%)]" />
            <div className="absolute inset-x-0 bottom-[12%] h-[30rem] bg-[radial-gradient(45%_50%_at_50%_70%,rgba(214,96,28,0.12),transparent_70%)]" />
            <div className="absolute top-1/2 left-1/2 h-[24rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(200,60,30,0.07)] blur-[100px]" />
            {/* a grain over the light, like worn stone */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }} />
          </div>
          <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-8 py-16 text-center">
            <h1 className="anim-card text-[clamp(2.6rem,5.2vw,5.2rem)] leading-[1.02] font-semibold tracking-[-0.05em] text-balance whitespace-nowrap max-sm:whitespace-normal">
              The Dota 2 file archive
            </h1>
            <p style={{ animationDelay: "90ms" }} className="anim-card mt-6 text-[clamp(1rem,1.15vw,1.15rem)] leading-relaxed text-balance text-ink-400 lg:whitespace-nowrap">
              Models, voice lines, effects and chest drops straight from the game{stats ? `, ${formatCount(stats.files)} files` : ""}, all free to download.
            </p>
            <form
              onSubmit={(e) => (e.preventDefault(), search())}
              style={{ animationDelay: "180ms" }}
              className="anim-card mt-10 flex h-[3.75rem] w-full max-w-[38rem] items-center gap-3 rounded-2xl border border-white/[0.1] bg-ink-900/90 p-1.5 pl-5 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)] backdrop-blur transition-colors focus-within:border-white/25"
            >
              <Search size={19} className="shrink-0 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Pudge, Crimson Witness, courier, berserkers_call..."
                className="h-full min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-ink-400"
              />
              <button type="submit" className="h-full rounded-xl bg-ink-100 px-5 text-[0.92rem] font-medium text-ink-950 transition-colors hover:bg-white">
                Search
              </button>
            </form>
            <nav style={{ animationDelay: "260ms" }} className="anim-card mt-6 flex flex-wrap items-center justify-center gap-x-1 gap-y-2 text-[0.9rem]">
              <span className="mr-1 text-ink-400">or open</span>
              {[
                ["/heroes", "Heroes"],
                ["/sets", "Sets"],
                ["/cosmetics/treasures", "Treasures"],
                ["/music", "Music"],
                ["/3d", "3D models"],
              ].map(([href, label]) => (
                <a key={href} href={link(href)} className="rounded-lg px-2.5 py-1 text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-100">
                  {label}
                </a>
              ))}
            </nav>
          </div>
          {catalog && <SideHeroes catalog={catalog} indexes={indexes} turn={turns} />}
        </section>

        {/* Every way in */}
        <section data-reveal className="mx-auto mt-20 max-w-[80rem] px-8">
          <div className="grid gap-4 md:grid-flow-dense md:grid-cols-3">
            <Door
              href="/heroes"
              icon={Users}
              title="Heroes"
              count={stats?.heroes}
              text="A page for each hero: its model in 3D, personas, abilities and story, its items by set, and every sound, effect, texture and picture of it."
              art={<Renders urls={lineup.slice(2, 5).map(heroCard)} />}
            />
            <Door href="/sets" icon={Layers} title="Sets" count={stats?.sets} text="Every set on its hero, worn together, with all of its files at once." art={<Renders urls={art.sets} />} />
            <Door href="/bundles" icon={Package} title="Bundles" count={stats?.bundles} text="What the store sells as one: open one to see its items on the hero." art={<Renders urls={art.bundles} />} />
            <Door href="/cosmetics/treasures" icon={Gift} title="Treasures" count={stats?.treasures} text="Every chest and capsule by year, with what it holds and its rare bonus drops." art={<Renders urls={art.treasures} />} />
            <Door href="/music" icon={Music} title="Music" count={stats?.music} text="Every music pack, its tracks by the moment of the game they play at." art={<Renders urls={art.music} covers />} />
            <Door
              href="/3d"
              icon={Box}
              title="3D models"
              count={stats?.models}
              text="Every model of the game as glb with its textures: heroes, items, couriers, creeps, trees, rocks, buildings. Search by words or by a screenshot."
              className="md:col-span-2"
              art={<Renders urls={art.models} />}
            />
            <Door href="/cosmetics" icon={Shirt} title="Cosmetics" count={stats?.items} text="Everything a player can own, by kind: couriers, wards, loading screens, HUDs, cursors, effects." art={<Renders urls={art.cosmetics} />} />
            <Door
              href={latestEvent ? `/cosmetics/${eventKind(latestEvent.id)}` : "/cosmetics"}
              icon={CalendarDays}
              title="Events"
              count={stats?.events}
              text={latestEvent ? `Battle passes and events with all they brought. The latest: ${catalog.events?.[latestEvent.id] || latestEvent.id}.` : "Battle passes and events with all they brought."}
              art={<Renders urls={art.events} />}
            />
            <Door href="/files" icon={Database} title="Files" count={stats?.files} text="The raw datasets, folder by folder, with search across all of them and downloads of whole folders." className="md:col-span-3" />
          </div>
        </section>

        {catalog && (
          <section data-reveal className="mx-auto mt-20 max-w-[80rem] px-8">
            <div className="flex items-baseline gap-4">
              <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">All {catalog.heroes.length} heroes</h2>
              <a href={link("/heroes")} className="ml-auto inline-flex items-center gap-1.5 text-[0.9rem] text-ink-300 hover:text-ink-100">
                With their pictures <ArrowRight size={14} />
              </a>
            </div>
            <div className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(8.5rem,1fr))] gap-1.5">
              {catalog.heroes.map((h) => (
                <a key={h.id} href={link(`/hero/${h.key}`)} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-[0.86rem] text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100">
                  <img src={heroIcon(h)} alt="" loading="lazy" className="h-6 w-6 shrink-0 rounded" />
                  <span className="truncate">{h.name}</span>
                </a>
              ))}
            </div>
          </section>
        )}

        <section data-reveal className="mx-auto mt-20 max-w-[80rem] px-8">
          <h2 className="text-[1.25rem] font-semibold tracking-[-0.02em]">Download and embed</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <Take icon={Database} title="Open datasets" href={OWNER_URL} link="Hugging Face">
              Every file sits in public datasets on Hugging Face. Download one file, a folder, or all of it with one command:
              <CopyLine text="hf download Sqls1/dota2-models --repo-type dataset" />
            </Take>
            <Take icon={Code2} title="Embed in your site" href={DOTADEX} link="Dotadex">
              Any hero, set or item in 3D on your own page. Each one has an Embed button with the code to paste, in the size you want.
            </Take>
          </div>
        </section>

        <section data-reveal className="mx-auto mt-20 max-w-[80rem] px-8">
          <div className="flex flex-wrap items-center gap-6 rounded-2xl border border-white/[0.06] bg-ink-900 p-7">
            <Heart size={22} className="shrink-0 text-ink-200" />
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.15rem] font-semibold tracking-[-0.02em]">Support the author</h2>
              <p className="mt-1.5 max-w-2xl text-[0.95rem] leading-relaxed text-ink-400">
                This site, Dotadex and the datasets behind them are made by one person, and the exports and hosting are kept running by hand. If they saved you time, you can help keep them going.
              </p>
            </div>
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="flex h-11 items-center gap-2 rounded-xl bg-ink-100 px-5 text-[0.92rem] font-medium text-ink-950 transition-colors hover:bg-white">
              <Heart size={16} /> Support on Ko-fi
            </a>
          </div>
        </section>

        <footer className="mx-auto mt-20 flex max-w-[80rem] flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.06] px-8 py-10 text-[0.88rem] text-ink-400">
          <span className="text-ink-300">Dotadex Files</span>
          <span>Not affiliated with Valve. Dota 2 content belongs to Valve Corporation.</span>
          <div className="ml-auto flex gap-6">
            <a href={OWNER_URL} target="_blank" rel="noreferrer" className="hover:text-ink-100">
              Datasets
            </a>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="hover:text-ink-100">
              Source
            </a>
            <a href={DOTADEX} target="_blank" rel="noreferrer" className="hover:text-ink-100">
              Dotadex
            </a>
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 hover:text-ink-100">
              <Heart size={14} /> Support the author
            </a>
          </div>
        </footer>
      </div>
    </div>
  );
}

// Two heroes of the day in 3D at the sides of the opening, in their default look on a lit floor,
// turning as the page scrolls (each its own way); they show once they stand
function SideHeroes({ catalog, indexes, turn }) {
  const [ready, setReady] = useState([false, false]);
  const heroes = useMemo(() => {
    const withModel = catalog.heroes.filter((h) => h.model);
    const day = Math.floor(Date.now() / 86400000);
    return [withModel[(day * 2) % withModel.length], withModel[(day * 2 + 37) % withModel.length]];
  }, [catalog]);
  const looks = useMemo(() => {
    if (!indexes.models) return [];
    const byPath = new Map(indexes.models.entries.map((e) => [e.path, e]));
    return heroes.map((h) => [h.model, ...(h.look || [])].map((p) => byPath.get(p)).filter(Boolean));
  }, [heroes, indexes.models]);
  if (!looks.length) return null;
  return heroes.map((hero, i) => (
    <a
      key={hero.id}
      href={link(`/hero/${hero.key}`)}
      title={hero.name}
      className={`absolute bottom-0 hidden h-[min(100dvh,70rem)] w-[min(42vw,50rem)] transition-opacity duration-1000 xl:block ${i ? "-right-[4vw]" : "-left-[4vw]"} ${ready[i] ? "opacity-100" : "opacity-0"}`}
    >
      <div
        style={{ background: `radial-gradient(closest-side, ${i ? "rgba(178,34,24,0.22)" : "rgba(214,96,28,0.2)"}, transparent)` }}
        className="pointer-events-none absolute inset-x-[10%] bottom-[6%] h-32 rounded-[100%] blur-2xl"
      />
      <Suspense fallback={null}>
        <HeroViewer models={looks[i]} bare showcase turn={turn[i]} onReady={() => setReady((r) => r.map((v, n) => v || n === i))} />
      </Suspense>
    </a>
  ));
}

// A strip of up to three pictures at the foot of a door: model renders standing on a dark floor, or
// music covers side by side
function Renders({ urls = [], covers = false }) {
  if (!urls.length) return null;
  return (
    <div className="mt-auto pt-6">
      <div className={`flex h-32 justify-center gap-2 rounded-xl bg-[radial-gradient(circle_at_50%_80%,#2a2a2f_0%,#161618_75%)] ${covers ? "items-center p-3" : "items-end px-4"}`}>
        {urls.map((u) => (
          <img
            key={u}
            src={u}
            alt=""
            loading="lazy"
            onError={(e) => (e.currentTarget.style.display = "none")}
            className={covers ? "h-full min-w-0 flex-1 rounded-lg object-cover" : "h-[92%] min-w-0 flex-1 object-contain transition-transform duration-500 group-hover:-translate-y-1"}
          />
        ))}
      </div>
    </div>
  );
}

// A way into a part of the site
function Door({ href, icon: Icon, title, count, text, className = "", art }) {
  return (
    <a
      href={link(href)}
      className={`group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-6 transition-colors hover:border-white/[0.16] hover:bg-ink-850 ${className}`}
    >
      <div className="flex items-center gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-ink-850 text-ink-200">
          <Icon size={17} />
        </span>
        <span className="text-[1.05rem] font-medium">{title}</span>
        {count != null && <span className="text-[0.88rem] text-ink-400 tabular-nums">{formatCount(count)}</span>}
        <ArrowRight size={16} className="ml-auto text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-100" />
      </div>
      <p className="mt-4 max-w-md text-[0.94rem] leading-relaxed text-ink-400">{text}</p>
      {art}
    </a>
  );
}

function Take({ icon: Icon, title, href, link: label, children }) {
  return (
    <div className="flex flex-col rounded-2xl border border-white/[0.06] bg-ink-900 p-6">
      <div className="flex items-center gap-3">
        <Icon size={18} className="text-ink-200" />
        <h3 className="text-[1.05rem] font-medium">{title}</h3>
      </div>
      <div className="mt-3 flex-1 text-[0.94rem] leading-relaxed text-ink-400">{children}</div>
      <a href={href} target="_blank" rel="noreferrer" className="mt-5 inline-flex items-center gap-1.5 text-[0.9rem] text-ink-200 hover:text-white">
        {label} <ArrowRight size={14} />
      </a>
    </div>
  );
}

function CopyLine({ text }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1400);
      }}
      title="Copy"
      className="mt-3 flex w-full items-center gap-2 rounded-lg bg-ink-950 px-3 py-2 text-left font-mono text-[0.76rem] text-ink-300 transition-colors hover:text-ink-100"
    >
      <span className="min-w-0 flex-1 truncate">{text}</span>
      {done ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
}
