import { useMemo, useState } from "react";
import {
  ArrowRight,
  AudioLines,
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
  ScanSearch,
  Search,
  Shirt,
  Swords,
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
        {/* The opening: what this is, a search over everything, the heroes standing on a lit floor */}
        <section className="relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-[44rem] bg-[radial-gradient(60%_50%_at_50%_0%,rgba(255,255,255,0.07),transparent_70%)]" />
          <div className="relative mx-auto flex max-w-4xl flex-col items-center px-8 pt-20 text-center">
            {catalog?.updated && (
              <a
                href={link("/files")}
                className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-ink-900/70 px-3.5 py-1.5 text-[0.82rem] text-ink-300 transition-colors hover:border-white/20 hover:text-ink-100"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Updated from the game {ago(catalog.updated)}
                <ArrowRight size={13} />
              </a>
            )}
            <h1 className="mt-7 text-[clamp(2.6rem,4.6vw,4.4rem)] leading-[1.02] font-semibold tracking-[-0.045em]">
              Every file of Dota 2,
              <br />
              <span className="text-ink-400">sorted and linked.</span>
            </h1>
            <p className="mt-6 max-w-2xl text-[1.08rem] leading-relaxed text-ink-300">
              Heroes with their models, items, voice lines and effects. Sets, bundles, treasures and what drops from them. Every model, texture, sound and picture of the game, free to download.
            </p>
            <label className="mt-10 flex h-14 w-full max-w-2xl items-center gap-3 rounded-2xl border border-white/[0.1] bg-ink-900/80 pr-2 pl-5 shadow-2xl shadow-black/40 backdrop-blur transition-colors focus-within:border-white/25">
              <Search size={19} className="shrink-0 text-ink-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && search()}
                placeholder="Search heroes, items and files"
                className="min-w-0 flex-1 bg-transparent text-[1rem] outline-none placeholder:text-ink-400"
              />
              <button onClick={search} className="h-10 rounded-xl bg-ink-100 px-4 text-[0.9rem] font-medium text-ink-950 transition-colors hover:bg-white">
                Search
              </button>
            </label>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-[0.88rem]">
              <a href={link("/heroes")} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-ink-900 px-4 transition-colors hover:border-white/20">
                <Users size={16} /> Browse heroes
              </a>
              <a href={link("/3d")} className="flex h-10 items-center gap-2 rounded-xl border border-white/[0.08] bg-ink-900 px-4 transition-colors hover:border-white/20">
                <ScanSearch size={16} /> Find a model by picture
              </a>
            </div>
          </div>

          <div className="relative mx-auto mt-14 max-w-[90rem] px-8">
            <div className="absolute inset-x-[10%] bottom-6 h-24 rounded-[100%] bg-white/[0.06] blur-3xl" />
            <div className="relative flex items-end justify-center [mask-image:linear-gradient(to_right,transparent,black_18%,black_82%,transparent)]">
              {lineup.map((hero, i) => (
                <a
                  key={hero.id}
                  href={link(`/hero/${hero.key}`)}
                  title={hero.name}
                  style={{ animationDelay: `${120 + i * 60}ms` }}
                  className={`anim-card group relative -mx-3 flex-1 ${i === 3 ? "z-10 max-w-[17rem]" : "max-w-[13rem]"}`}
                >
                  <img
                    src={heroRender(hero)}
                    alt={hero.name}
                    loading="lazy"
                    onError={(e) => (e.currentTarget.style.visibility = "hidden")}
                    className={`mx-auto aspect-square w-full object-contain transition-transform duration-500 group-hover:-translate-y-1.5 ${i === 3 ? "" : "opacity-75 group-hover:opacity-100"}`}
                  />
                </a>
              ))}
            </div>
            <div className="h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
          </div>
        </section>

        {/* The numbers */}
        <section className="mx-auto mt-16 max-w-[80rem] px-8">
          <dl className="grid grid-cols-2 overflow-hidden rounded-2xl border border-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
            {[
              ["Files", n(stats?.files)],
              ["In all", stats ? formatSize(stats.bytes) : "…"],
              ["3D models", n(stats?.models)],
              ["Sounds", n(stats?.sounds)],
              ["Items", n(stats?.items)],
              ["Heroes", n(stats?.heroes)],
            ].map(([label, value]) => (
              <div key={label} className="border-white/[0.06] p-6 [&:not(:last-child)]:border-r">
                <dd className="text-[1.9rem] font-semibold tracking-[-0.03em] tabular-nums">{value}</dd>
                <dt className="mt-1 text-[0.88rem] text-ink-400">{label}</dt>
              </div>
            ))}
          </dl>
        </section>

        {/* Every way in */}
        <section className="mx-auto mt-28 max-w-[80rem] px-8">
          <h2 className="max-w-2xl text-[2rem] leading-tight font-semibold tracking-[-0.035em]">Start anywhere.</h2>
          <p className="mt-3 max-w-2xl text-[1.02rem] text-ink-400">Each part of the game has a place of its own, and every place leads to the files behind it.</p>
          <div className="mt-10 grid auto-rows-[minmax(11rem,auto)] gap-4 md:grid-cols-3">
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

        {/* What makes it more than a dump of files */}
        <section className="mx-auto mt-28 max-w-[80rem] px-8">
          <h2 className="max-w-2xl text-[2rem] leading-tight font-semibold tracking-[-0.035em]">Linked the way the game links it.</h2>
          <p className="mt-3 max-w-2xl text-[1.02rem] text-ink-400">Nothing here is sorted by hand. The site reads the game's own data and follows its references.</p>
          <div className="mt-10 grid gap-px overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.06] md:grid-cols-3">
            <Point icon={Swords} title="From a hero to every file">
              A hero leads to its items, its items to their sets and bundles, and each to the models, textures, effects and sounds it uses. Any file shows what uses it.
            </Point>
            <Point icon={AudioLines} title="Sounds that know when they play">
              Every voice line carries the game's own rule for it: on a kill, on buying Blink Dagger, when the target is Pudge, a 25% chance.
            </Point>
            <Point icon={Gift} title="Treasures that know what drops">
              A chest lists its contents and its rare bonus drops; an item lists the chests it drops from, the bundles it comes in and the event it came with.
            </Point>
          </div>
        </section>

        {/* Ways to take it */}
        <section className="mx-auto mt-28 max-w-[80rem] px-8">
          <h2 className="max-w-2xl text-[2rem] leading-tight font-semibold tracking-[-0.035em]">Take it with you.</h2>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <Take icon={Database} title="Open datasets" href={OWNER_URL} link="Hugging Face">
              Every file sits in public datasets on Hugging Face. Download one file, a folder, or all of it with one command:
              <CopyLine text="hf download Sqls1/dota2-models --repo-type dataset" />
            </Take>
            <Take icon={Code2} title="Embed in your site" href={DOTADEX} link="Dotadex">
              Any hero, set or item in 3D on your own page. Each one has an Embed button with the code to paste, in the size you want.
            </Take>
            <Take icon={Check} title="Always current" href={SOURCE_URL} link="Source">
              After each game update the files are exported again and the site rebuilds itself, new heroes and items included.
            </Take>
          </div>
        </section>

        <footer className="mx-auto mt-28 flex max-w-[80rem] flex-wrap items-center gap-x-8 gap-y-3 border-t border-white/[0.06] px-8 py-10 text-[0.88rem] text-ink-400">
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

function Point({ icon: Icon, title, children }) {
  return (
    <div className="bg-ink-950 p-7">
      <Icon size={20} className="text-ink-200" />
      <h3 className="mt-5 text-[1.05rem] font-medium">{title}</h3>
      <p className="mt-2 text-[0.94rem] leading-relaxed text-ink-400">{children}</p>
    </div>
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
