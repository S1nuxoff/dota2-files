import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, ArrowUpRight, Check, Copy, Heart, Plus, ScanSearch, Search, Sparkles } from "lucide-react";
import { DATASETS, DOTADEX, cliCommand, datasetById, fileUrl, repoUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { link } from "../lib/route.js";
import { openPalette } from "../lib/palette.js";
import { heroCard, heroSelection, imageUrl, prefabTitle } from "../lib/catalog.js";
import { SEARCH_KEY, SOURCE_URL, SUPPORT_URL } from "./TopBar.jsx";
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

// The front page: the opening with the search and the heroes, then the long read under it: what can
// be downloaded, how the files get here, what is done and what comes next. Every number is taken
// from the files themselves
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

  return (
    <div className="pt-14">
      <Opening catalog={catalog} stats={stats} />
      {catalog && <Story catalog={catalog} indexes={indexes} stats={stats} />}
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


// What each dataset holds, in words: the folders people come for and the formats they get
const HOLDS = {
  images: ["hero portraits and animated selection art", "item, ability and rune icons", "loading screens and emoticons", "every picture of the interface"],
  models: ["heroes with every persona", "cosmetics, couriers and wards", "creeps, buildings, trees and props", "animations, cloth, faces and skins inside each glb"],
  textures: ["colour, normal and mask maps", "of heroes, items, units and the world", "HDR ones as EXR"],
  sounds: ["voice lines of every hero and announcer", "music packs and the menu", "abilities, items and the world", "sound events with volume and pitch"],
  videos: ["animated hero portraits", "intros and the interface's clips", "subtitles"],
  particles: ["every effect the game plays", "arcana and immortal effects", "their textures and the engine's defaults"],
  maps: ["the whole map and every terrain", "menu backgrounds and MVP scenes", "treasure openings and event scenes"],
  data: ["items_game and every hero, ability and item script", "texts in every language", "materials and sound events", "Panorama layouts, styles and fonts"],
};
const FORMATS = { images: "PNG", models: "glb", textures: "PNG, EXR", sounds: "MP3, WAV", videos: "WebM, MP4", particles: "JSON", maps: "glb", data: "JSON" };

// The way from a game update to a file on this site
const STEPS = [
  ["Valve ships an update", "Dota 2 changes on Steam a few times a week: a patch, an event, a new set. Nothing here waits for anyone to notice."],
  ["The tracker checks the game", "A GitHub workflow wakes every six hours, logs into Steam and compares the game's version with the last run. When nothing changed it stops within seconds, without downloading anything."],
  ["It reads the game's own files", "When something did change, it opens the game's archive, about 388,000 files and 70 GB, and finds what was added, changed or removed since last time, file by file."],
  ["Each kind is turned into something you can open", "Models become glb with their textures, animations and cloth (through Source 2 Viewer), textures PNG, scripts and texts JSON, particle systems JSON, interface layouts plain text. Sounds stay as the game keeps them."],
  ["Only what changed is uploaded", "The files go to eight public datasets on Hugging Face at the game's own paths, with a list of every file and the names people know them by. A run that changed three icons uploads three icons."],
  ["The game is linked together", "A catalog ties every hero to its personas, sets and items, every item to its chests and every file it is made of. Every model gets a picture from two sides and a search index, so it can be found by how it looks."],
  ["This site rebuilds itself", "Every day and after every change the site reads the new lists, writes about 20,000 pages and goes live. Downloads go straight to Hugging Face: there is no server of ours in between."],
];

// What is there, newest first, and what comes next
const DONE = [
  ["2026-10-26", "The map", "The whole map and every terrain, each a few hundred MB, on a page of its own."],
  ["2026-10-25", "Search by look", "Describe a model in words or cut it out of a screenshot: every model's picture is compared with it."],
  ["2026-10-25", "Embeds", "Any hero or item in 3D on your own site, with the game's shading, by pasting one line."],
  ["2026-10-25", "This site", "Heroes, cosmetics, sets, treasures, music, 3D models and every folder of the game, each with its downloads."],
  ["2026-10-24", "The whole game in datasets", "One tracker, eight datasets, every model, texture, sound, picture, video, effect, map and script."],
  ["2026-10-24", "Names people know", "Pictures and models carry the names the game shows, not only their file names."],
];
const NEXT = [
  [true, "Every update checked against SteamDB", "After each patch, compare the game's list of changed files with what was exported, and report anything missed."],
  [true, "Effects as the game draws them", "The engine's defaults for every particle setting, so effects in Dotadex match the game more closely."],
  [false, "A public Dota 2 API", "Static JSON of every hero, ability, item, cosmetic, set and treasure in every language, each pointing at its pictures, models and sounds."],
  [false, "More of the client", "Default item builds, the map editor's entities, the network messages and the engine's classes, read from the game itself."],
  [false, "Names for sounds", "Voice lines and music with the words and titles the game gives them."],
  [false, "Hero statistics", "Pick and win rates, popular items and matchups, taken once per run so the site never depends on a live API."],
  [false, "Abilities as in a match", "Each ability's effects and sounds played on a target, the way a match shows them."],
];

const FAQ = [
  ["Is it free?", "Yes. Every file can be downloaded without an account, one by one, as a folder, or a whole dataset at once."],
  ["Whose files are these?", "Valve's. Dota 2 and everything in it belong to Valve Corporation; this is a fan project that only makes the game's own files easier to reach. It is not affiliated with Valve."],
  ["How fresh is it?", "The tracker checks the game every six hours and exports what changed, so new heroes, sets and patches show up within hours of release."],
  ["Which formats?", "Models and maps as glb (glTF 2.0) with textures and animations inside, pictures and textures as PNG (EXR for HDR), sounds as MP3 or WAV, everything else as JSON."],
  ["Can I use the files in my project?", "For fan works, videos, mods and tools, as Valve's own terms for fan content allow. Selling them is not allowed."],
  ["Something is missing or wrong", "Open an issue on GitHub with the page and what you expected; the tracker and this site are both open source."],
];

// Below the opening: what the files are, how they get here, what is done and what comes, how to use them
function Story({ catalog, indexes, stats }) {
  return (
    <div className="pb-8">
      <Statement catalog={catalog} stats={stats} />
      <Downloads indexes={indexes} />
      <Latest catalog={catalog} />
      <Counted catalog={catalog} />
      <Finding />
      <HowItWorks />
      <Formats />
      <Progress />
      <ForDevelopers />
      <InDotadex />
      <BuiltOn />
      <Questions />
      <Closing />
    </div>
  );
}

// A part of the page: its title and a few words in the middle, its content in a column under them
// (narrow: a column of text; else as wide as a page of reading)
function Part({ id, title, text, children, aside, narrow = false }) {
  return (
    <section id={id} className="page-x mt-32 scroll-mt-24 sm:mt-44">
      <div data-reveal className="mx-auto flex max-w-2xl flex-col items-center text-center">
        <h2 className="text-[clamp(2.1rem,3.8vw,3.4rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">{title}</h2>
        {text && <p className="mt-5 text-[1.05rem] leading-relaxed text-balance text-ink-400">{text}</p>}
        {aside}
      </div>
      <div className={`mx-auto mt-12 min-w-0 sm:mt-16 ${narrow ? "max-w-3xl" : "max-w-[72rem]"}`}>{children}</div>
    </section>
  );
}

// The whole of it in one sentence, its numbers in white
function Statement({ catalog, stats }) {
  const b = (v) => <span className="text-ink-100">{v}</span>;
  const n = (v) => (stats.complete ? formatCount(v) : "…");
  return (
    <section className="page-x mt-24 sm:mt-32">
      <p data-reveal className="mx-auto max-w-[62rem] text-center text-[clamp(1.5rem,2.9vw,2.6rem)] leading-[1.18] font-medium tracking-[-0.035em] text-pretty text-ink-500">
        {b(`${n(stats.files)} files`)} and {b(stats.complete ? formatSize(stats.bytes) : "…")} of Dota 2, taken from the game itself: {b(`${formatCount(stats.heroes)} heroes`)},{" "}
        {b(`${formatCount(stats.items)} cosmetic items`)} in {b(`${formatCount(stats.sets)} sets`)}, {b(`${n(stats.models)} models`)} and {b(`${n(stats.sounds)} sounds`)}. Sorted, linked, previewed, and updated
        {catalog.updated ? <> {b(ago(catalog.updated))}</> : null}.
      </p>
    </section>
  );
}

// Every dataset as a row: what it holds, how many files, how much, where to go
function Downloads({ indexes }) {
  return (
    <Part
      id="downloads"
      title="What you can download"
      text="Everything sits in eight public datasets, one per kind of file, at the paths the game itself uses. Take one file, a folder or all of it."
      aside={
        <div className="mt-7 flex flex-wrap justify-center gap-x-7 gap-y-1 text-[0.92rem]">
          {[
            ["/heroes", "Start from a hero"],
            ["/cosmetics", "Browse cosmetics"],
            ["/3d", "Find a 3D model"],
            ["/map", "Get the map"],
          ].map(([href, label]) => (
            <a key={href} href={link(href)} className="group inline-flex items-center gap-2 py-1 text-ink-300 transition-colors hover:text-ink-100">
              {label} <ArrowRight size={15} className="text-ink-500 transition-transform group-hover:translate-x-0.5 group-hover:text-ink-100" />
            </a>
          ))}
        </div>
      }
    >
      <ul className="border-b border-white/[0.08]">
        {DATASETS.map((d) => {
          const index = indexes[d.id];
          const files = index?.entries.filter((e) => !e.copy);
          const bytes = files?.reduce((s, e) => s + e.size, 0);
          const Icon = d.icon;
          return (
            <li key={d.id} data-reveal className="group grid gap-x-8 gap-y-3 border-t border-white/[0.08] py-7 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] xl:grid-cols-[minmax(0,13rem)_minmax(0,1fr)_minmax(0,10rem)]">
              <div>
                <a href={link(`/${d.id}`)} className="inline-flex items-center gap-2.5 text-[1.3rem] font-semibold tracking-[-0.025em] transition-colors hover:text-white">
                  <Icon size={19} strokeWidth={1.7} className="text-ink-400 transition-colors group-hover:text-ember" />
                  {d.title}
                </a>
                <div className="mt-1.5 font-mono text-[0.78rem] text-ink-500">{d.repo}</div>
              </div>
              <div className="min-w-0">
                <p className="text-[0.98rem] leading-relaxed text-ink-200">{d.blurb}</p>
                <p className="mt-2 text-[0.9rem] leading-relaxed text-ink-400">{HOLDS[d.id].join(" · ")}</p>
              </div>
              <div className="flex items-baseline gap-x-5 gap-y-1 sm:col-start-2 xl:col-start-auto xl:flex-col xl:items-end xl:text-right">
                <div className="text-[1.15rem] font-medium tabular-nums">{files ? formatCount(files.length) : "…"}<span className="ml-1.5 text-[0.84rem] font-normal text-ink-500">files</span></div>
                <div className="text-[0.88rem] text-ink-400 tabular-nums">
                  {bytes != null ? formatSize(bytes) : "…"} · {FORMATS[d.id]}
                </div>
                <div className="flex gap-4 text-[0.86rem] xl:mt-2">
                  <a href={link(`/${d.id}`)} className="text-ink-300 transition-colors hover:text-ink-100">
                    Browse
                  </a>
                  <a href={repoUrl(d)} target="_blank" rel="noreferrer" className="inline-flex items-center gap-0.5 text-ink-400 transition-colors hover:text-ink-100">
                    Hub <ArrowUpRight size={13} />
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Part>
  );
}

// The way from a game update to these pages, as a line of steps
function HowItWorks() {
  return (
    <Part
      id="how"
      narrow
      title="How it works"
      text="No one uploads anything by hand. One program watches the game and keeps the files in step with it; this site is drawn from what that program leaves behind."
      aside={
        <a href="https://github.com/S1nuxoff/dota2-game-tracker" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-1.5 text-[0.92rem] text-ink-300 transition-colors hover:text-ink-100">
          The tracker's code <ArrowUpRight size={15} />
        </a>
      }
    >
      <ol className="relative">
        {/* the line the steps hang on, lit at its end */}
        <span aria-hidden="true" className="absolute top-3 bottom-3 left-[0.9375rem] w-px bg-gradient-to-b from-white/[0.14] via-white/[0.1] to-ember/60" />
        {STEPS.map(([title, text], i) => (
          <li key={title} data-reveal className="relative grid grid-cols-[2rem_minmax(0,1fr)] gap-x-6 pb-11 last:pb-0">
            <span
              className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full border font-mono text-[0.78rem] tabular-nums ${
                i === STEPS.length - 1 ? "border-ember/70 bg-ink-950 text-ember" : "border-white/[0.14] bg-ink-950 text-ink-300"
              }`}
            >
              {i + 1}
            </span>
            <div className="pt-0.5">
              <h3 className="text-[1.2rem] font-semibold tracking-[-0.02em]">{title}</h3>
              <p className="mt-2 max-w-2xl text-[0.98rem] leading-relaxed text-ink-400">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </Part>
  );
}

// What is done, by date, and what is being made or comes next
function Progress() {
  return (
    <Part id="progress" title="What is done, what comes next" text="The project grows a little every day. The newest first; what is being worked on now is marked with a lit dot.">
      <div className="grid gap-x-12 gap-y-14 xl:grid-cols-2">
        <div>
          <h3 className="text-[0.92rem] font-medium text-ink-300">Done</h3>
          <ul className="mt-4 border-b border-white/[0.08]">
            {DONE.map(([date, title, text]) => (
              <li key={title} data-reveal className="grid grid-cols-[5.5rem_minmax(0,1fr)] gap-x-5 border-t border-white/[0.08] py-5">
                <time dateTime={date} className="pt-0.5 font-mono text-[0.78rem] text-ink-500 tabular-nums">
                  {date.slice(5).replace("-", ".")}
                </time>
                <div>
                  <div className="flex items-center gap-2 text-[1rem] font-medium">
                    <Check size={15} className="shrink-0 text-ink-400" /> {title}
                  </div>
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="flex items-center gap-4 text-[0.92rem] font-medium text-ink-300">
            Next
            <span className="flex items-center gap-3 text-[0.8rem] font-normal text-ink-500">
              <span className="flex items-center gap-1.5"><Dot lit /> in progress</span>
              <span className="flex items-center gap-1.5"><Dot /> planned</span>
            </span>
          </h3>
          <ul className="mt-4 border-b border-white/[0.08]">
            {NEXT.map(([now, title, text]) => (
              <li key={title} data-reveal className="grid grid-cols-[1.25rem_minmax(0,1fr)] gap-x-3 border-t border-white/[0.08] py-5">
                <span className="pt-2">
                  <Dot lit={now} />
                </span>
                <div>
                  <div className={`text-[1rem] font-medium ${now ? "text-ink-100" : "text-ink-200"}`}>{title}</div>
                  <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-400">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Part>
  );
}

function Dot({ lit }) {
  return lit ? (
    <span className="relative flex h-2 w-2">
      <span className="absolute inset-0 animate-ping rounded-full bg-ember/60" />
      <span className="relative h-2 w-2 rounded-full bg-ember" />
    </span>
  ) : (
    <span className="block h-2 w-2 rounded-full border border-ink-500" />
  );
}

// The files from code: a link to any file, the list of all of them, a whole dataset, a hero in 3D
function ForDevelopers() {
  const models = datasetById("models");
  const images = datasetById("images");
  return (
    <Part
      id="developers"
      title="For developers"
      text="Every file has a plain address that never changes while the game keeps it. Fetch it from a script, a bot or a page; no key, no account."
    >
      <div className="grid gap-4 2xl:grid-cols-2">
        <Code title="Any file by its game path" lines={[`curl -LO ${fileUrl(images, "panorama/images/heroes/npc_dota_hero_pudge_png.png")}`]} />
        <Code title="Every file of a dataset, with its size" lines={[`curl -L ${fileUrl(models, "files.json.gz")} | gunzip`, `# { "files": [["models/heroes/pudge/pudge.glb", <size>], ...] }`]} />
        <Code title="A whole dataset, or one folder of it" lines={["pip install -U huggingface_hub", cliCommand(models, "models/heroes/pudge")]} />
        <Code title="A hero in 3D on your page" lines={[`<iframe src="${DOTADEX}/embed/hero/pudge"`, '  width="800" height="500" style="border:0"></iframe>']} />
      </div>
    </Part>
  );
}

// A few lines of code, copied with a click
function Code({ title, lines }) {
  const [done, setDone] = useState(false);
  return (
    <div data-reveal className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-white/[0.08] bg-ink-900">
      <div className="flex items-center gap-3 border-b border-white/[0.06] py-2.5 pr-2.5 pl-4">
        <span className="text-[0.86rem] text-ink-300">{title}</span>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(lines.filter((l) => !l.startsWith("#")).join("\n"));
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
          title="Copy"
          aria-label={`Copy: ${title}`}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-md text-ink-400 transition-colors hover:bg-white/[0.06] hover:text-ink-100"
        >
          {done ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
        </button>
      </div>
      <pre className="overflow-x-auto px-4 py-3.5 font-mono text-[0.78rem] leading-relaxed text-ink-200">
        {lines.map((l, i) => (
          <div key={i} className={l.startsWith("#") ? "text-ink-500" : ""}>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}

// The questions people ask first, opened one at a time
function Questions() {
  return (
    <Part id="faq" title="Questions" narrow>
      <div className="border-b border-white/[0.08]">
        {FAQ.map(([q, a]) => (
          <details key={q} data-reveal className="group border-t border-white/[0.08]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[1.05rem] font-medium transition-colors hover:text-white [&::-webkit-details-marker]:hidden">
              {q}
              <Plus size={18} className="shrink-0 text-ink-400 transition-transform duration-300 group-open:rotate-45" />
            </summary>
            <p className="max-w-2xl pb-6 text-[0.98rem] leading-relaxed text-ink-400">{a}</p>
          </details>
        ))}
      </div>
    </Part>
  );
}

// The last word: who makes it, and a way to help
function Closing() {
  return (
    <section className="page-x mt-28 sm:mt-40">
      <div data-reveal className="relative overflow-hidden pt-14 pb-24">
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 -bottom-24 h-64 bg-[radial-gradient(45%_60%_at_50%_100%,rgba(229,70,46,0.16),transparent_70%)]" />
        <div className="relative flex flex-col items-center gap-10 text-center">
          <div className="flex flex-col items-center">
            <h2 className="max-w-3xl text-[clamp(2.2rem,4.6vw,4rem)] leading-[1] font-semibold tracking-[-0.05em] text-balance">Made and kept running by one person</h2>
            <p className="mt-5 max-w-xl text-[1.02rem] leading-relaxed text-balance text-ink-400">
              The tracker, the datasets, this site and Dotadex. If they saved you an evening of digging through the game's files, you can help keep them going.
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl bg-ink-100 px-6 text-[0.95rem] font-medium text-ink-950 transition-colors hover:bg-white">
              <Heart size={17} className="text-ember" /> Support the author
            </a>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl border border-white/[0.1] px-6 text-[0.95rem] text-ink-100 transition-colors hover:border-white/25">
              Source on GitHub <ArrowUpRight size={16} />
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

// The newest bundles the game added, with their heroes, newest first
function Latest({ catalog }) {
  const list = useMemo(
    () =>
      Object.entries(catalog.items)
        .filter(([, it]) => it.prefab === "bundle" && it.icon && it.date)
        .sort((a, b) => b[1].date.localeCompare(a[1].date))
        .slice(0, 8),
    [catalog]
  );
  if (!list.length) return null;
  return (
    <Part
      id="latest"
      narrow
      title="Fresh from the game"
      text={`What the last updates brought, the day they came out. The newest is from ${list[0][1].date}; every one is here with its models, textures and icons.`}
      aside={
        <a href={link("/bundles")} className="group mt-8 inline-flex items-center gap-2 text-[0.92rem] text-ink-300 transition-colors hover:text-ink-100">
          Every bundle <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </a>
      }
    >
      <ul className="border-b border-white/[0.08]">
        {list.map(([id, it]) => {
          const heroes = it.heroes.map((h) => catalog.heroById.get(h)?.name).filter(Boolean);
          const rarity = catalog.rarities[it.rarity];
          return (
            <li key={id} data-reveal className="border-t border-white/[0.08]">
              <a href={link(`/item/${id}`)} className="group grid grid-cols-[5.5rem_minmax(0,1fr)] items-center gap-x-5 py-3.5 sm:grid-cols-[7rem_minmax(0,1fr)_auto]">
                <span className="aspect-[256/170] overflow-hidden rounded-lg bg-ink-900">
                  <img src={imageUrl(it.icon)} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[1.02rem] font-medium transition-colors group-hover:text-white">{it.name}</span>
                  <span className="mt-1 flex items-center gap-2 text-[0.86rem] text-ink-400">
                    {rarity && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: rarity.color }} />}
                    <span className="truncate">{[rarity?.name, heroes.join(", ")].filter(Boolean).join(" · ")}</span>
                  </span>
                </span>
                <time dateTime={it.date} className="hidden font-mono text-[0.78rem] text-ink-500 tabular-nums sm:block">
                  {it.date}
                </time>
              </a>
            </li>
          );
        })}
      </ul>
    </Part>
  );
}

// The kinds of things the game gives and how rare they are, as lines measured against each other
const NOT_SHOWN = new Set(["tool", "default_item", "misc", "dynamic_recipe", "socket_gem", "key", "retired_treasure_chest", "sticker_capsule"]);
function Counted({ catalog }) {
  const { kinds, rarities } = useMemo(() => {
    const items = Object.values(catalog.items);
    const by = (pick) => {
      const out = new Map();
      for (const it of items) {
        const k = pick(it);
        if (k) out.set(k, (out.get(k) || 0) + 1);
      }
      return [...out];
    };
    return {
      kinds: by((it) => !NOT_SHOWN.has(it.prefab) && it.prefab)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 12),
      rarities: by((it) => catalog.rarities[it.rarity] && it.rarity).sort((a, b) => catalog.rarities[a[0]].order - catalog.rarities[b[0]].order),
    };
  }, [catalog]);
  const top = Math.max(...kinds.map(([, v]) => v));
  const most = Math.max(...rarities.map(([, v]) => v));
  return (
    <Part id="counted" title="Cosmetics, counted" text="Every item the game has ever had: worn by heroes, carried, shown on a loading screen, played as music. Each one opens to its files.">
      <div className="grid gap-x-12 gap-y-14 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div>
          <h3 className="text-[0.92rem] font-medium text-ink-300">By kind</h3>
          <ul className="mt-5 space-y-1">
            {kinds.map(([k, v]) => (
              <li key={k} data-reveal>
                <a href={link(`/cosmetics/${k}`)} className="group grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)_4.5rem] items-center gap-x-4 py-2">
                  <span className="truncate text-[0.95rem] text-ink-200 capitalize transition-colors group-hover:text-white">{prefabTitle(k)}</span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <span className="block h-full rounded-full bg-ink-300 transition-colors group-hover:bg-ember" style={{ width: `${Math.max(1.5, (v / top) * 100)}%` }} />
                  </span>
                  <span className="text-right text-[0.9rem] text-ink-400 tabular-nums">{formatCount(v)}</span>
                </a>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="text-[0.92rem] font-medium text-ink-300">By rarity</h3>
          <ul className="mt-5 space-y-1">
            {rarities.map(([k, v]) => {
              const r = catalog.rarities[k];
              return (
                <li key={k} data-reveal className="grid grid-cols-[minmax(0,7rem)_minmax(0,1fr)_4.5rem] items-center gap-x-4 py-2">
                  <span className="flex items-center gap-2 text-[0.95rem] text-ink-200">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
                    {r.name}
                  </span>
                  <span className="h-1.5 overflow-hidden rounded-full bg-white/[0.05]">
                    <span className="block h-full rounded-full opacity-80" style={{ width: `${Math.max(1.5, (v / most) * 100)}%`, background: r.color }} />
                  </span>
                  <span className="text-right text-[0.9rem] text-ink-400 tabular-nums">{formatCount(v)}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Part>
  );
}

// The three ways to find a file
const WAYS = [
  [Search, "By name", "Type a hero, an item, a set or a file's path. Typos are forgiven and words are matched to the names the game uses, so “puge berserkr” still finds Pudge.", "Search everything"],
  [Sparkles, "By how it looks", "On the 3D models page, describe a model in a few words: “a red dragon with wings”. Every model's picture is compared with them by a model that runs in your browser.", "Open 3D models"],
  [ScanSearch, "By a screenshot", "Paste a screenshot from a match or a video and draw a box around the thing you want; the models that look most like it come first.", "Try it"],
];
function Finding() {
  return (
    <Part id="finding" title="Three ways to find a file" text="Most files have names no one would guess. So the site lets you look for them the way you remember them.">
      <div className="grid gap-x-10 gap-y-12 md:grid-cols-3">
        {WAYS.map(([Icon, title, text, label], i) => (
          <div key={title} data-reveal className="flex flex-col items-center border-t border-white/[0.08] pt-8 text-center">
            <Icon size={22} strokeWidth={1.5} className="text-ember" />
            <h3 className="mt-5 text-[1.2rem] font-semibold tracking-[-0.02em]">{title}</h3>
            <p className="mt-2.5 flex-1 text-[0.96rem] leading-relaxed text-ink-400">{text}</p>
            {i === 0 ? (
              <button onClick={() => openPalette()} className="group mt-5 inline-flex items-center gap-2 text-[0.9rem] text-ink-300 transition-colors hover:text-ink-100">
                {label} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </button>
            ) : (
              <a href={link("/3d")} className="group mt-5 inline-flex items-center gap-2 text-[0.9rem] text-ink-300 transition-colors hover:text-ink-100">
                {label} <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
              </a>
            )}
          </div>
        ))}
      </div>
    </Part>
  );
}

// What opens each kind of file
const TOOLS = [
  ["glb", "Models and maps", "Blender (File, Import, glTF 2.0), Unity and Unreal with a glTF importer, three.js or Babylon.js, or any online glTF viewer. Textures, skeletons and animations come inside the file."],
  ["PNG, EXR", "Pictures and textures", "Any image editor. EXR holds HDR values (light probes, some effects): Photoshop, Krita, GIMP and Blender read it."],
  ["MP3, WAV", "Sounds", "Any player or editor. Voice lines are grouped by hero, music by pack."],
  ["JSON", "Scripts, texts, effects", "Any text editor or language. Valve's KeyValues and KV3 are turned into plain JSON, keys as the game writes them."],
  ["WebM, MP4", "Videos", "Any browser or player; animated portraits keep their transparency in WebM."],
];
function Formats() {
  return (
    <Part id="formats" narrow title="Opening the files" text="Nothing here needs the game's own tools. Every file is in a format ordinary programs open.">
      <dl className="border-b border-white/[0.08]">
        {TOOLS.map(([ext, what, how]) => (
          <div key={ext} data-reveal className="grid gap-x-8 gap-y-2 border-t border-white/[0.08] py-6 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
            <dt>
              <div className="font-mono text-[0.95rem] text-ink-100">{ext}</div>
              <div className="mt-1 text-[0.88rem] text-ink-500">{what}</div>
            </dt>
            <dd className="text-[0.98rem] leading-relaxed text-ink-400">{how}</dd>
          </div>
        ))}
      </dl>
    </Part>
  );
}

// The sister site that draws the same files the way the game does
function InDotadex() {
  return (
    <Part id="dotadex" title="See it as the game does" text="The same files are the base of Dotadex: heroes and items with the game's own shading, lights, particles and voice lines, in the browser.">
      <div data-reveal className="flex flex-col items-center gap-10">
        <ul className="space-y-4 text-[1rem] leading-relaxed text-ink-300">
          {["Every persona and set worn together, any style, one link to share", "Effects of every item and arcana, as in a match", "Voice lines with their lip sync, treasures and the client's scenes"].map((t) => (
            <li key={t} className="flex gap-3">
              <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ember" />
              {t}
            </li>
          ))}
        </ul>
        <a href={DOTADEX} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl border border-white/[0.1] px-6 text-[0.95rem] text-ink-100 transition-colors hover:border-white/25">
          Open Dotadex <ArrowUpRight size={16} />
        </a>
      </div>
    </Part>
  );
}

// The work of others this stands on
const CREDITS = [
  ["Valve", "https://www.dota2.com", "made the game and every file in it"],
  ["Source 2 Viewer", "https://github.com/ValveResourceFormat/ValveResourceFormat", "reads Valve's formats and turns models, textures and maps into glTF and PNG"],
  ["Hugging Face", "https://huggingface.co", "keeps the datasets and serves every download"],
  ["SteamDB GameTracking", "https://github.com/SteamDatabase/GameTracking-Dota2", "the record of every change to the game's files"],
  ["DotaFlow client dump", "https://github.com/DotaFlow/dota2_client_dump", "the engine's schema: the defaults of every particle setting"],
  ["GitHub", "https://github.com/S1nuxoff", "runs the tracker every six hours and hosts this site"],
];
function BuiltOn() {
  return (
    <Part id="credits" title="Built on" text="One person keeps it running, on the shoulders of others.">
      <ul className="grid gap-x-10 border-b border-white/[0.08] sm:grid-cols-2">
        {CREDITS.map(([name, href, what]) => (
          <li key={name} data-reveal className="border-t border-white/[0.08] py-5">
            <a href={href} target="_blank" rel="noreferrer" className="group inline-flex items-center gap-1.5 text-[1.02rem] font-medium transition-colors hover:text-white">
              {name} <ArrowUpRight size={14} className="text-ink-500 transition-colors group-hover:text-ink-100" />
            </a>
            <p className="mt-1.5 text-[0.92rem] leading-relaxed text-ink-400">{what}</p>
          </li>
        ))}
      </ul>
    </Part>
  );
}
