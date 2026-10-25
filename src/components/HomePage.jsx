import { useMemo, useState } from "react";
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
import { eventKind } from "./CosmeticsPage.jsx";

const OWNER_URL = "https://huggingface.co/Sqls1";
const SOURCE_URL = "https://github.com/S1nuxoff/dota2-files";
const SUPPORT_URL = "https://ko-fi.com/s1nuxoff";

// The site's render of a hero's body (previews/models/heroes/<x>/<x>.webp)
const heroRender = (hero) => (hero.model ? fileUrl(datasetById("models"), `previews/${hero.model.replace(/\.glb$/, "")}.webp`) : "");

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
    return Array.from({ length: 7 }, (_, i) => withModel[(day * 7 + i * 17) % withModel.length]);
  }, [catalog]);
  const latestEvent = useMemo(() => {
    if (!catalog) return null;
    let best = null;
    for (const item of Object.values(catalog.items)) if (item.event && (!best || (item.date || "") > best.date)) best = { id: item.event, date: item.date || "" };
    return best;
  }, [catalog]);

  const n = (v) => (stats ? formatCount(v) : "…");

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="anim-page">
        <section className="mx-auto flex max-w-4xl flex-col items-center px-8 pt-20 text-center">
          <h1 className="max-w-3xl text-[clamp(2.4rem,4.2vw,3.8rem)] leading-[1.06] font-semibold tracking-[-0.045em]">
            Every model, sound and picture of Dota 2, ready to download
          </h1>
          <p className="mt-6 max-w-2xl text-[1.05rem] leading-relaxed text-ink-400">
            {stats ? `${formatCount(stats.files)} files, ${formatSize(stats.bytes)},` : "All the files"} taken straight from the game and sorted the way the game sorts them: by hero, item, set, bundle and treasure.
            Open a hero to get its model with animations, its items, voice lines and effects, or search the whole game at once.
            {catalog?.updated && ` Last updated ${ago(catalog.updated)}.`}
          </p>
          <label className="mt-9 flex h-13 w-full max-w-2xl items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-900 pr-2 pl-4 transition-colors focus-within:border-white/20">
            <Search size={18} className="shrink-0 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && search()}
              placeholder="Search heroes, items and files"
              className="h-12 min-w-0 flex-1 bg-transparent text-[0.98rem] outline-none placeholder:text-ink-400"
            />
          </label>
        </section>

        <section className="mx-auto mt-12 max-w-[90rem] px-8">
          <div className="flex items-end justify-center [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]">
            {lineup.map((hero, i) => (
              <a key={hero.id} href={link(`/hero/${hero.key}`)} title={hero.name} className={`group relative -mx-3 flex-1 ${i === 3 ? "z-10 max-w-[16rem]" : "max-w-[12.5rem]"}`}>
                <img
                  src={heroRender(hero)}
                  alt={hero.name}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                  className="mx-auto aspect-square w-full object-contain transition-transform duration-300 group-hover:-translate-y-1"
                />
              </a>
            ))}
          </div>
          <div className="h-px bg-white/[0.08]" />
        </section>

        {/* Every way in */}
        <section className="mx-auto mt-14 max-w-[80rem] px-8">
          <div className="grid auto-rows-[minmax(11rem,auto)] gap-4 md:grid-cols-3">
            <Door
              href="/heroes"
              icon={Users}
              title="Heroes"
              count={stats?.heroes}
              text="A page for each hero: its model in 3D, personas, abilities and story, its items by set, and every sound, effect, texture and picture of it."
              className="md:row-span-2"
              art={
                <div className="mt-6 grid grid-cols-3 gap-2">
                  {lineup.slice(0, 6).map((h) => (
                    <div key={h.id} className="aspect-square rounded-xl bg-[radial-gradient(circle_at_50%_60%,#2c2c31_0%,#18181b_75%)]">
                      <img src={heroRender(h)} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
                    </div>
                  ))}
                </div>
              }
            />
            <Door href="/sets" icon={Layers} title="Sets" count={stats?.sets} text="Every set on its hero, worn together, with all of its files at once." />
            <Door href="/bundles" icon={Package} title="Bundles" count={stats?.bundles} text="What the store sells as one: open one to see its items on the hero." />
            <Door href="/cosmetics/treasures" icon={Gift} title="Treasures" count={stats?.treasures} text="Every chest and capsule by year, with what it holds and its rare bonus drops." />
            <Door href="/music" icon={Music} title="Music" count={stats?.music} text="Every music pack, its tracks by the moment of the game they play at." />
            <Door
              href="/3d"
              icon={Box}
              title="3D models"
              count={stats?.models}
              text="Every model of the game as glb with its textures: heroes, items, couriers, creeps, trees, rocks, buildings. Search by words or by a screenshot."
              className="md:col-span-2"
            />
            <Door href="/cosmetics" icon={Shirt} title="Cosmetics" count={stats?.items} text="Everything a player can own, by kind: couriers, wards, loading screens, HUDs, cursors, effects." />
            <Door
              href={latestEvent ? `/cosmetics/${eventKind(latestEvent.id)}` : "/cosmetics"}
              icon={CalendarDays}
              title="Events"
              count={stats?.events}
              text={latestEvent ? `Battle passes and events with all they brought. The latest: ${catalog.events?.[latestEvent.id] || latestEvent.id}.` : "Battle passes and events with all they brought."}
            />
            <Door href="/files" icon={Database} title="Files" count={stats?.files} text="The raw datasets, folder by folder, with search across all of them and downloads of whole folders." />
          </div>
        </section>

        <section className="mx-auto mt-20 max-w-[80rem] px-8">
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

        <section className="mx-auto mt-20 max-w-[80rem] px-8">
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
