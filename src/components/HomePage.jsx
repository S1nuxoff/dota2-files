import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, Heart, Search } from "lucide-react";
import { DATASETS, DOTADEX } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { link, openItem } from "../lib/route.js";
import { openPalette } from "../lib/palette.js";
import { previewOf } from "./CosmeticsPage.jsx";
import { heroCard, heroPortrait, heroSelection, imageUrl } from "../lib/catalog.js";
import { DATASETS_URL, SEARCH_KEY, SOURCE_URL, SUPPORT_URL } from "./TopBar.jsx";
import { HeadGlow } from "./ui.jsx";

// "3 hours ago", "2 days ago"
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!(s >= 0)) return "";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} minutes ago`;
  if (s < 86400) return `${Math.round(s / 3600)} hours ago`;
  return `${Math.round(s / 86400)} days ago`;
}

// The heroes of the day, by a seeded shuffle: the same all day, others tomorrow
function daily(list, n) {
  let seed = Math.floor(Date.now() / 86400000);
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 5; i++) rand();
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out.slice(0, n);
}

// The front page: what the site holds and the way into each part of it, every number and picture
// taken from the files themselves
export default function HomePage({ catalog, indexes }) {
  const stats = useMemo(() => {
    if (!catalog) return null;
    const items = Object.values(catalog.items);
    const loaded = DATASETS.filter((d) => indexes[d.id]);
    return {
      heroes: catalog.heroes.length,
      items: items.length,
      sets: catalog.setByKey.size,
      treasures: items.filter((i) => i.loot).length,
      music: items.filter((i) => i.prefab === "music").length,
      files: loaded.reduce((n, d) => n + indexes[d.id].entries.filter((e) => !e.copy).length, 0),
      bytes: loaded.reduce((n, d) => n + indexes[d.id].entries.reduce((m, e) => m + (e.copy ? 0 : e.size), 0), 0),
      models: indexes.models?.entries.filter((e) => e.ext === "glb" && !e.path.startsWith("previews/")).length || 0,
      sounds: indexes.sounds?.entries.filter((e) => e.kind === "audio").length || 0,
      complete: loaded.length === DATASETS.length,
    };
  }, [catalog, indexes]);
  const n = (v) => (stats && v ? formatCount(v) : "…");

  return (
    <div className="pt-14">
      <Opening catalog={catalog} stats={stats} />
      {catalog && (
        <>
          <Numbers stats={stats} />
          <Browse catalog={catalog} stats={stats} indexes={indexes} n={n} />
          <InTheGame catalog={catalog} />
          <Treasures catalog={catalog} n={n} stats={stats} />
          <Developers n={n} stats={stats} />
          <Closing />
        </>
      )}
    </div>
  );
}

// The opening: what this is, the search, and the heroes going round on an arc of light under it
function Opening({ catalog, stats }) {
  return (
    <section className="relative -mt-14 flex flex-col overflow-hidden pt-14 sm:min-h-[min(100svh,64rem)]">
      {/* the red of the Dotadex mark, as a light from above */}
      <HeadGlow className="" />
      <div className="relative z-10 page-x flex flex-col items-center pt-16 text-center sm:pt-[max(3rem,calc(50svh-18rem))]">
        {/* the title's words rise one after another out of their line */}
        <h1 aria-label="Every file of Dota 2" className="max-w-4xl text-[clamp(2.5rem,6.4vw,5.6rem)] leading-[1.02] font-semibold tracking-[-0.055em] text-balance">
          {["Every", "file", "of", "Dota 2"].map((w, i) => (
            <span key={w} aria-hidden="true" className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <span className="anim-word inline-block" style={{ animationDelay: `${120 + i * 90}ms` }}>
                {w}
              </span>
              {i < 3 && " "}
            </span>
          ))}
        </h1>
        <p style={{ animationDelay: "520ms" }} className="anim-card mt-6 max-w-2xl text-[clamp(1rem,1.25vw,1.2rem)] leading-relaxed text-balance text-ink-400">
          {stats?.complete ? `${formatCount(stats.files)} files` : "Every file"} straight from the game, sorted and free to download.
        </p>
        <button
          onClick={() => openPalette()}
          style={{ animationDelay: "640ms" }}
          className="anim-card group mt-9 flex h-14 w-full max-w-[36rem] items-center gap-3 rounded-2xl border border-white/[0.1] bg-ink-900/85 pr-2 pl-5 text-left shadow-[0_24px_70px_-24px_rgba(0,0,0,0.9)] backdrop-blur-md transition-colors hover:border-white/[0.2]"
        >
          <Search size={19} className="shrink-0 text-ink-400" />
          <span className="flex-1 truncate text-[1rem] text-ink-500">Pudge, Crimson Witness, courier…</span>
          <kbd className="hidden rounded-lg border border-white/10 px-2 py-1 font-sans text-[0.74rem] text-ink-400 sm:block">{SEARCH_KEY}</kbd>
          <span className="flex h-10 items-center rounded-xl bg-ink-100 px-4 text-[0.9rem] font-medium text-ink-950 transition-colors group-hover:bg-white">Search</span>
        </button>
        <nav style={{ animationDelay: "760ms" }} className="anim-card mt-5 flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 text-[0.88rem]" aria-label="Popular">
          <span className="mr-1 text-ink-500">Popular:</span>
          {[
            ["/sets", "Sets"],
            ["/cosmetics/treasures", "Treasures"],
            ["/cosmetics/courier", "Couriers"],
            ["/music", "Music"],
            ["/3d", "3D models"],
          ].map(([href, label]) => (
            <a key={href} href={link(href)} className="rounded-lg px-2.5 py-1 text-ink-300 transition-colors hover:bg-white/[0.06] hover:text-ink-100">
              {label}
            </a>
          ))}
        </nav>
        {catalog?.updated && <p style={{ animationDelay: "880ms" }} className="anim-fade mt-6 text-[0.8rem] text-ink-500">Updated {ago(catalog.updated)}, after every patch</p>}
      </div>
      {catalog && <HeroArc heroes={catalog.heroes} />}
    </section>
  );
}

// Heroes standing on a great wheel that turns slowly, only its top showing, tilted along it; a line
// of light runs under them. The wheel stops under the pointer; each hero opens its page
function HeroArc({ heroes }) {
  const picks = useMemo(() => daily(heroes, 28), [heroes]);
  const step = 360 / picks.length;
  // The wheel's middle: its radius below the top card's centre, which stands half a card (1 : 1.1 of
  // a card 0.17 of the radius wide) and a gap below the top of the band, so no card is cut there
  const centre = "calc(var(--r) * 1.094 + 2rem)";
  // The wheel turns on with the page's scroll, a degree for every 14 px, easing after it
  const wheel = useRef(null);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    let shown = window.scrollY / 14;
    let frame = 0;
    const tick = () => {
      const target = window.scrollY / 14;
      shown += (target - shown) * 0.12;
      if (wheel.current) wheel.current.style.transform = `rotate(${(-shown).toFixed(3)}deg)`;
      frame = Math.abs(target - shown) > 0.01 ? requestAnimationFrame(tick) : 0;
    };
    const onScroll = () => (frame ||= requestAnimationFrame(tick));
    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);
  return (
    <div
      className="group relative mt-10 h-[clamp(15rem,34vw,32rem)] w-full shrink-0 [--r:max(28rem,min(62vw,68rem))] max-sm:[--r:150vw] sm:mt-auto [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent,black_16%,black_84%,transparent),linear-gradient(to_bottom,black_62%,transparent)]"
    >
      {/* the heroes stand on a world's rim: a wide faint atmosphere rises above the line, and its light
          runs down over the world below it, fading into the page */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 h-[calc(var(--r)*1.76)] w-[calc(var(--r)*1.76)] -translate-x-1/2 rounded-full"
        style={{
          top: `calc(${centre} - var(--r) * 0.88)`,
          background: "radial-gradient(70% 30% at 50% 0%, rgba(229,70,46,0.2), rgba(229,70,46,0.07) 45%, transparent 80%)",
          boxShadow: "0 -8px 50px -14px rgba(255,130,90,0.45), 0 -36px 160px -30px rgba(229,70,46,0.45), inset 0 30px 80px -50px rgba(255,150,110,0.4)",
        }}
      />
      <div ref={wheel} className="absolute left-1/2 h-0 w-0 will-change-transform" style={{ top: centre }}>
      <div className="anim-roll h-0 w-0" style={{ animationDelay: "350ms" }}>
      <div className="anim-turn h-0 w-0 will-change-transform group-hover:[animation-play-state:paused]" style={{ "--turn": "260s" }}>
        {/* the line of light, turning with the wheel: one fine stroke whose brightness flows along it,
            bright reaches easing into dim ones, so its turning shows */}
        <svg
          aria-hidden="true"
          viewBox="0 0 1000 1000"
          className="pointer-events-none absolute overflow-visible"
          style={{ left: "calc(var(--r) * -0.88)", top: "calc(var(--r) * -0.88)", width: "calc(var(--r) * 1.76)", height: "calc(var(--r) * 1.76)" }}
        >
          <defs>
            {/* brightness flowing along the ring: soft bright reaches easing into dim ones */}
            <linearGradient id="arc-light" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#ff9a74" stopOpacity="0.35" />
              <stop offset="0.18" stopColor="#ffd2b8" stopOpacity="1" />
              <stop offset="0.36" stopColor="#ff9a74" stopOpacity="0.4" />
              <stop offset="0.52" stopColor="#fff0e6" stopOpacity="1" />
              <stop offset="0.68" stopColor="#ff9a74" stopOpacity="0.38" />
              <stop offset="0.84" stopColor="#ffc6a6" stopOpacity="0.95" />
              <stop offset="1" stopColor="#ff9a74" stopOpacity="0.35" />
            </linearGradient>
          </defs>
          <circle cx="500" cy="500" r="499" fill="none" stroke="url(#arc-light)" strokeWidth="2.2" />
        </svg>
        {picks.map((hero, i) => (
          <a
            key={hero.id}
            href={link(`/hero/${hero.key}`)}
            title={hero.name}
            className="arc-card group/card absolute top-0 left-0 block aspect-[1/1.1] w-[calc(var(--r)*0.17)]"
            style={{ transform: `translate(-50%, -50%) rotate(${i * step}deg) translateY(calc(var(--r) * -1))` }}
          >
            {/* the hero whole, as the game's set pages show it (448 x 678, empty above and below), on no
                card of its own: its rows 55 to 545 fill the place, head to feet, the sides the render cut
                fading out; the ones on top of the wheel load first */}
            <img
              src={heroCard(hero)}
              alt={hero.name}
              decoding="async"
              fetchPriority={Math.min(i, picks.length - i) < 5 ? "high" : "low"}
              onError={(e) => e.currentTarget.src !== heroSelection(hero) && (e.currentTarget.src = heroSelection(hero))}
              className="absolute top-[-11.2%] left-0 w-full max-w-none transition-[filter] duration-300 [mask-composite:intersect] [mask-image:linear-gradient(to_right,transparent_2%,black_26%,black_74%,transparent_98%),linear-gradient(to_bottom,black_66%,transparent_82%)] group-hover/card:drop-shadow-[0_0_18px_rgba(229,70,46,0.7)]"
            />
          </a>
        ))}
      </div>
      </div>
      </div>
    </div>
  );
}

// The numbers of it, in a row
function Numbers({ stats }) {
  const cells = [
    [stats.heroes, "heroes"],
    [stats.items, "cosmetic items"],
    [stats.sets, "sets"],
    [stats.models, "3D models"],
    [stats.sounds, "sounds"],
    [stats.bytes, "of files", true],
  ];
  return (
    <section data-reveal className="page-x relative z-10 -mt-6">
      <dl className="grid grid-cols-3 gap-px overflow-hidden rounded-2xl border border-white/[0.07] bg-white/[0.06] sm:grid-cols-3 lg:grid-cols-6">
        {cells.map(([v, label, size]) => (
          <div key={label} className="bg-ink-950/90 px-3 py-3.5 backdrop-blur sm:px-6 sm:py-5">
            <dd className="text-[clamp(1.1rem,2.4vw,2.1rem)] font-semibold tracking-[-0.04em] tabular-nums">{v ? (size ? formatSize(v) : formatCount(v)) : "…"}</dd>
            <dt className="mt-1 text-[0.74rem] leading-tight text-ink-400 sm:text-[0.84rem]">{label}</dt>
          </div>
        ))}
      </dl>
    </section>
  );
}

// A heading of a block of the front page
function Head({ title, text, href, more }) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <h2 className="text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.045em] text-balance">{title}</h2>
        {text && <p className="mt-4 text-[1.02rem] leading-relaxed text-pretty text-ink-400">{text}</p>}
      </div>
      {href && (
        <a href={link(href)} className="group inline-flex shrink-0 items-center gap-1.5 text-[0.92rem] text-ink-300 transition-colors hover:text-ink-100">
          {more} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      )}
    </div>
  );
}

// The site's parts as tiles of different sizes, each pictured by what it holds
function Browse({ catalog, stats, indexes, n }) {
  const heroes = useMemo(() => daily(catalog.heroes, 3), [catalog]);
  const sets = useMemo(
    () =>
      [...catalog.setByKey.values()]
        .filter((s) => s.icon && s.hero)
        .sort((a, b) => b.items.length - a.items.length)
        .slice(0, 60),
    [catalog]
  );
  const shownSets = useMemo(() => daily(sets, 5), [sets]);
  const chest = useMemo(() => latestChest(catalog), [catalog]);
  const pack = useMemo(
    () =>
      Object.values(catalog.items)
        .filter((i) => i.prefab === "music" && i.icon)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0],
    [catalog]
  );
  const models = useMemo(() => latestModels(catalog, 6), [catalog]);
  const tile = "group relative flex flex-col overflow-hidden rounded-3xl border border-white/[0.07] bg-ink-900 transition-[border-color,transform] duration-500 ease-[var(--ease-out-soft)] hover:border-white/[0.16]";
  const caption = (title, text) => (
    <div className="relative z-10 mt-auto flex items-end justify-between gap-4 p-5 sm:p-6">
      <div className="min-w-0">
        <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">{title}</h3>
        <p className="mt-1 text-[0.88rem] leading-snug text-ink-400">{text}</p>
      </div>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/[0.1] text-ink-300 transition-all group-hover:border-white/30 group-hover:bg-white group-hover:text-ink-950">
        <ArrowUpRight size={16} />
      </span>
    </div>
  );

  return (
    <section className="page-x mt-28 sm:mt-36">
      <div data-reveal>
        <Head title="Everything in its place, and linked" text="A hero knows its sets, a set its items, an item the chests it drops from and every file it is made of." />
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-12 lg:grid-rows-[repeat(3,minmax(15rem,auto))]">
        <a data-reveal href={link("/heroes")} className={`${tile} min-h-[24rem] lg:col-span-6 lg:row-span-2`}>
          <div aria-hidden="true" className="absolute inset-x-0 top-0 h-[78%] bg-[radial-gradient(60%_70%_at_50%_100%,rgba(229,70,46,0.18),transparent_70%)]" />
          <div className="absolute inset-x-0 top-6 bottom-24 flex items-end justify-center">
            {heroes.map((h, i) => (
              <img
                key={h.id}
                src={heroCard(h)}
                alt=""
                loading="lazy"
                onError={(e) => (e.currentTarget.src = heroPortrait(h))}
                className={`h-full max-h-[30rem] w-auto object-contain transition-transform duration-700 ease-[var(--ease-out-soft)] [mask-image:linear-gradient(to_bottom,black_80%,transparent)] ${
                  i === 1 ? "relative z-10 group-hover:-translate-y-2" : `-mx-[8%] opacity-70 ${i === 0 ? "group-hover:-translate-x-3" : "group-hover:translate-x-3"}`
                } ${i !== 1 ? "max-h-[24rem] scale-90" : ""}`}
              />
            ))}
          </div>
          {caption("Heroes", `${n(stats.heroes)} heroes, each with its model, personas, items, abilities and voice lines`)}
        </a>

        <a data-reveal href={link("/sets")} className={`${tile} min-h-[17rem] lg:col-span-6`}>
          <div className="flex gap-2 p-5 pb-0 sm:gap-3 sm:p-6 sm:pb-0">
            {shownSets.map((s, i) => (
              <img
                key={s.key}
                src={imageUrl(s.icon)}
                alt=""
                loading="lazy"
                style={{ transitionDelay: `${i * 40}ms` }}
                className="aspect-[448/678] min-w-0 flex-1 rounded-xl border border-white/[0.06] object-cover object-top transition-transform duration-500 group-hover:-translate-y-1.5 max-sm:[&:nth-child(n+4)]:hidden"
              />
            ))}
          </div>
          {caption("Sets", `${n(stats.sets)} sets on their heroes, a whole set in one download`)}
        </a>

        <a data-reveal href={link("/cosmetics/treasures")} className={`${tile} min-h-[17rem] lg:col-span-3`}>
          <div className="flex flex-1 items-center justify-center p-6 pb-0">
            {chest && <img src={imageUrl(chest.icon)} alt="" loading="lazy" className="max-h-36 w-auto rounded-xl transition-transform duration-700 ease-[var(--ease-out-soft)] group-hover:scale-105 group-hover:-rotate-2" />}
          </div>
          {caption("Treasures", `${n(stats.treasures)} chests and what drops from them`)}
        </a>

        <a data-reveal href={link("/music")} className={`${tile} min-h-[17rem] lg:col-span-3`}>
          <div className="flex flex-1 items-center justify-center gap-5 p-6 pb-0">
            {pack && <img src={imageUrl(pack.icon)} alt="" loading="lazy" className="h-24 w-auto rounded-xl" />}
            <span aria-hidden="true" className="flex h-14 items-end gap-1">
              {[0, 1, 2, 3, 4].map((b) => (
                <span key={b} className="h-full w-1.5 origin-bottom rounded-full bg-ink-300 [animation-play-state:paused] group-hover:[animation-play-state:running]" style={{ animation: `bar ${0.6 + b * 0.13}s ease-in-out ${b * -0.17}s infinite`, transform: `scaleY(${0.3 + (b % 3) * 0.25})` }} />
              ))}
            </span>
          </div>
          {caption("Music", `${n(stats.music)} music packs to play and download`)}
        </a>

        <a data-reveal href={link("/3d")} className={`${tile} min-h-[17rem] lg:col-span-6`}>
          <div className="grid grid-cols-3 gap-px bg-white/[0.04] sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
            {models.map(([item, url]) => (
              <div key={item.id} className="stage relative flex aspect-square items-center justify-center p-3">
                <img src={url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-contain transition-transform duration-700 group-hover:scale-110" />
              </div>
            ))}
          </div>
          {caption("3D Models", `${n(stats.models)} models as glb with textures, found by name, by look or by a screenshot`)}
        </a>

        <a data-reveal href={link("/files")} className={`${tile} min-h-[17rem] lg:col-span-6`}>
          <ul className="px-5 pt-4 text-[0.86rem] sm:px-6">
            {DATASETS.slice(0, 5).map((d) => {
              const Icon = d.icon;
              const index = indexes[d.id];
              return (
                <li key={d.id} className="flex items-center gap-3 border-b border-white/[0.05] py-2.5">
                  <Icon size={15} className="text-ink-400" />
                  <span className="flex-1">{d.title}</span>
                  <span className="text-ink-500 tabular-nums">{index ? `${formatCount(index.count)} files` : ""}</span>
                  <span className="w-16 text-right text-ink-300 tabular-nums">{index ? formatSize(index.size) : "…"}</span>
                </li>
              );
            })}
          </ul>
          {caption("Files", `${n(stats.files)} files in eight datasets, by folder, with previews`)}
        </a>
      </div>
    </section>
  );
}

// Heroes to show in Dotadex on the front page, picked from by the row under the stage
const SHOWN = ["pudge", "invoker", "juggernaut", "crystal_maiden", "nevermore", "phantom_assassin", "lina", "axe"];

// Dotadex, the site that shows heroes and items as the game does: a hero standing large (a picture,
// no 3D here, so the front page stays light), opening it in Dotadex; a row of heroes to switch it
function InTheGame({ catalog }) {
  const heroes = useMemo(() => SHOWN.map((k) => catalog.heroByKey.get(k)).filter(Boolean), [catalog]);
  const [key, setKey] = useState(() => heroes[Math.floor(Date.now() / 86400000) % heroes.length]?.key);
  const hero = catalog.heroByKey.get(key);
  if (!hero) return null;
  return (
    <section className="page-x mt-28 sm:mt-36">
      <div data-reveal className="grid items-center gap-10 lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] xl:gap-16">
        <div className="max-lg:text-center">
          <img src={`${import.meta.env.BASE_URL}logo.png`} alt="Dotadex" width="875" height="113" className="h-5 w-auto max-lg:mx-auto" />
          <h2 className="mt-6 text-[clamp(1.9rem,3.4vw,3rem)] leading-[1.05] font-semibold tracking-[-0.045em] text-balance">Every hero, as the game shows it</h2>
          <p className="mt-4 text-[1.02rem] leading-relaxed text-pretty text-ink-400">
            Dotadex draws heroes and items with the game's own shaders, lights and particles: every persona and set worn together, the voice lines with their lip sync, the treasures and scenes of the client. Free, in the browser.
          </p>
          <ul className="mt-7 space-y-3 text-left text-[0.92rem] text-ink-300 max-lg:mx-auto max-lg:max-w-sm">
            {["The game's hero shading, not a generic viewer", "Effects of every item and arcana, as in a match", "Any set on its hero, any style, one link to share"].map((t) => (
              <li key={t} className="flex gap-3">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
                {t}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-wrap gap-3 max-lg:justify-center">
            <a href={`${DOTADEX}/hero/${hero.key}`} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl bg-ink-100 px-6 text-[0.95rem] font-medium text-ink-950 transition-colors hover:bg-white">
              Open {hero.name} in Dotadex <ArrowUpRight size={17} />
            </a>
            <a href={DOTADEX} target="_blank" rel="noreferrer" className="flex h-12 items-center rounded-xl border border-white/[0.1] px-6 text-[0.95rem] text-ink-100 transition-colors hover:border-white/25">
              All of Dotadex
            </a>
          </div>
        </div>
        <div>
          <a href={`${DOTADEX}/hero/${hero.key}`} target="_blank" rel="noreferrer" title={`Open ${hero.name} in Dotadex`} className="group relative block h-[min(64vh,40rem)] max-sm:h-[26rem]">
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[10%] bottom-[4%] h-[34%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(229,70,46,0.2),transparent)] transition-opacity duration-500 group-hover:opacity-100 opacity-70" />
            <img
              key={hero.key}
              src={heroCard(hero)}
              alt={hero.name}
              className="anim-fade absolute inset-0 m-auto h-[112%] max-h-none w-auto max-w-full -translate-y-[4%] object-contain transition-transform duration-700 ease-[var(--ease-out-soft)] [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)] group-hover:-translate-y-[6%]"
            />
            <span className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-black/55 px-4 py-2 text-[0.84rem] text-ink-100 opacity-0 backdrop-blur transition-opacity duration-300 group-hover:opacity-100 max-md:opacity-100">
              See {hero.name} in 3D <ArrowUpRight size={14} />
            </span>
          </a>
          <div className="no-bar mt-4 flex justify-center gap-2 overflow-x-auto px-1 pb-1">
            {heroes.map((h) => (
              <button
                key={h.key}
                onClick={() => setKey(h.key)}
                title={h.name}
                aria-pressed={h.key === key}
                className={`h-12 w-[4.5rem] shrink-0 overflow-hidden rounded-lg border transition-all ${h.key === key ? "border-white/60 opacity-100" : "border-white/[0.08] opacity-55 hover:opacity-90"}`}
              >
                <img src={heroPortrait(h)} alt={h.name} loading="lazy" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// The latest chest that gives several things with pictures
function latestChest(catalog) {
  return Object.values(catalog.items)
    .filter((i) => i.loot && i.icon && i.loot.drops.filter((d) => catalog.items[d]?.icon).length >= 6)
    .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0];
}

// The site's renders of the latest models of wearables, couriers and wards, each picture once
function latestModels(catalog, count) {
  const kinds = new Set(["wearable", "courier", "ward"]);
  const out = [];
  const seen = new Set();
  const items = Object.values(catalog.items)
    .filter((i) => kinds.has(i.prefab) && i.date)
    .sort((a, b) => b.date.localeCompare(a.date) || Number(b.id) - Number(a.id));
  for (const item of items) {
    const url = previewOf(item, catalog);
    if (!url || seen.has(url)) continue;
    seen.add(url);
    out.push([item, url]);
    if (out.length === count) break;
  }
  return out;
}

// The latest chest open: its picture and name, what drops from it with each rarity's colour, and
// its rare extras
function Treasures({ catalog, n, stats }) {
  const chest = useMemo(() => latestChest(catalog), [catalog]);
  if (!chest) return null;
  const drops = chest.loot.drops.map((d) => catalog.items[d]).filter((d) => d?.icon).slice(0, 12);
  const bonus = chest.loot.bonus.map(([d]) => catalog.items[d]).filter((d) => d?.icon).slice(0, 6);
  const list = [...drops, ...bonus].map((d) => d.id);
  const cell = (item) => (
    <button
      key={item.id}
      onClick={() => openItem(item.id, list)}
      title={item.name}
      className="group/cell relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850 transition-colors hover:border-white/25"
    >
      <img src={imageUrl(item.icon)} alt={item.name} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover/cell:scale-[1.06]" />
      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: catalog.rarities[item.rarity || "common"]?.color || "transparent" }} />
    </button>
  );
  return (
    <section className="page-x mt-28 sm:mt-36">
      <div data-reveal>
        <Head
          title="Every chest, and what is inside it"
          text={`${n(stats.treasures)} treasures and capsules with their contents and rare bonus drops. An item knows the chests it drops from and the bundles it comes in.`}
          href="/cosmetics/treasures"
          more="All treasures"
        />
      </div>
      <div data-reveal className="surface mt-10 grid gap-8 overflow-hidden rounded-3xl p-5 sm:p-8 md:grid-cols-[16rem_1fr] lg:grid-cols-[19rem_1fr] lg:p-10">
        <button onClick={() => openItem(chest.id)} className="group flex flex-row items-center gap-5 text-left md:flex-col md:items-start">
          <img src={imageUrl(chest.icon)} alt={chest.name} className="w-32 rounded-2xl transition-transform duration-500 group-hover:scale-[1.03] md:w-full" />
          <span>
            <span className="block text-[1.1rem] font-semibold tracking-[-0.02em]">{chest.name}</span>
            <span className="mt-1 block text-[0.86rem] text-ink-400">
              {chest.date?.slice(0, 4)}, {chest.loot.drops.length} items inside
            </span>
            <span className="mt-4 inline-flex items-center gap-1.5 text-[0.88rem] text-ink-200 group-hover:text-ink-100">
              Open the chest <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </span>
          </span>
        </button>
        <div>
          <div className="text-[0.82rem] font-medium text-ink-400">Contents</div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">{drops.map(cell)}</div>
          {bonus.length > 0 && (
            <>
              <div className="mt-7 text-[0.82rem] font-medium text-ink-400">Rare bonus drops</div>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">{bonus.map(cell)}</div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// For people who build: the datasets from the command line, a hero in 3D on their own page
function Developers({ n, stats }) {
  return (
    <section className="page-x mt-28 sm:mt-36">
      <div data-reveal>
        <Head
          title="Take the files anywhere"
          text={`${n(stats.files)} files in public datasets on Hugging Face, updated after each patch. Download one file, a folder or all of it, or show any hero and item in 3D on your own site.`}
        />
      </div>
      <div data-reveal className="mt-10 grid gap-4 lg:grid-cols-2">
        <Code title="Download a dataset" href={DATASETS_URL} label="Hugging Face" lines={["pip install -U huggingface_hub", "hf download Sqls1/dota2-models --repo-type dataset"]} />
        <Code title="Embed a hero in 3D" href={DOTADEX} label="Dotadex" lines={[`<iframe src="${DOTADEX}/embed/hero/pudge"`, '  width="800" height="500"', '  style="border:0;border-radius:12px"></iframe>']} />
      </div>
    </section>
  );
}

// A few lines of code in a terminal-like panel, copied with a click
function Code({ title, href, label, lines }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <span className="flex gap-1.5" aria-hidden="true">
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
          <span className="h-2.5 w-2.5 rounded-full bg-ink-700" />
        </span>
        <span className="text-[0.86rem] font-medium">{title}</span>
        <a href={href} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[0.82rem] text-ink-400 hover:text-ink-100">
          {label} <ArrowUpRight size={13} />
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(lines.join("\n"));
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
          title="Copy"
          aria-label="Copy"
          className="text-ink-400 hover:text-ink-100"
        >
          {done ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.78rem] leading-relaxed text-ink-300 sm:p-5">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="mr-4 text-ink-600 select-none">{i + 1}</span>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

// The last word: who makes it, and a way to help
function Closing() {
  return (
    <section data-reveal className="relative mt-28 overflow-hidden px-4 py-24 text-center sm:mt-36 sm:py-32">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_70%_at_50%_100%,rgba(229,70,46,0.2),transparent_70%)]" />
      <h2 className="relative text-[clamp(2rem,4vw,3.4rem)] leading-[1.05] font-semibold tracking-[-0.045em]">Made by one person</h2>
      <p className="relative mx-auto mt-5 max-w-xl text-[1.02rem] leading-relaxed text-balance text-ink-400">
        This site, Dotadex and the datasets behind them are built and kept running by hand. If they saved you time, you can help keep them going.
      </p>
      <div className="relative mt-9 flex flex-wrap justify-center gap-3">
        <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl bg-ink-100 px-6 text-[0.95rem] font-medium text-ink-950 transition-colors hover:bg-white">
          <Heart size={17} className="text-ember" /> Support the author
        </a>
        <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl border border-white/[0.1] bg-ink-900/80 px-6 text-[0.95rem] text-ink-100 transition-colors hover:border-white/25">
          Source on GitHub
        </a>
      </div>
    </section>
  );
}
