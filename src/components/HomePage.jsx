import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Box,
  Check,
  Code2,
  Copy,
  Database,
  Gift,
  Heart,
  Search,
  Users,
} from "lucide-react";
import { DATASETS, DOTADEX } from "../datasets.js";
import { formatCount } from "../lib/format.js";
import { link, navigate, openItem } from "../lib/route.js";
import { previewOf } from "./CosmeticsPage.jsx";
import { heroIcon } from "./HeroPicker.jsx";
import { heroCard, imageUrl } from "../lib/catalog.js";

const OWNER_URL = "https://huggingface.co/Sqls1";
const SOURCE_URL = "https://github.com/S1nuxoff/dota2-files";
const SUPPORT_URL = "https://ko-fi.com/s1nuxoff";

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


  const n = (v) => (stats ? formatCount(v) : "…");

  return (
    <div
      className="min-h-0 flex-1 overflow-y-auto pt-0"
      onScroll={(e) => {
        const top = e.currentTarget.scrollTop;
        e.currentTarget.style.setProperty("--p", String(Math.min(1, top / (e.currentTarget.clientHeight * 0.7))));
        e.currentTarget.style.setProperty("--s", String(top));
      }}
    >
      <div ref={page}>
        {/* The opening reaches up under the top bar, so its light shows through the bar's blur */}
        <section className="relative flex min-h-[100dvh] flex-col pt-14">
          {catalog && <HeroField heroes={catalog.heroes} />}
          {/* Light as in the game's menu: the deep red of the Dota mark from above, embers rising from below */}
          <div aria-hidden="true" className="anim-fade pointer-events-none absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,black_65%,transparent)]">
            <div className="absolute inset-x-0 top-0 h-[46rem] bg-[radial-gradient(55%_55%_at_50%_0%,rgba(178,34,24,0.28),rgba(120,20,14,0.10)_45%,transparent_75%)]" />
            <div className="absolute inset-x-0 bottom-[12%] h-[30rem] bg-[radial-gradient(45%_50%_at_50%_70%,rgba(214,96,28,0.12),transparent_70%)]" />
            <div className="absolute top-1/2 left-1/2 h-[24rem] w-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[rgba(200,60,30,0.07)] blur-[100px]" />
            {/* a grain over the light, like worn stone */}
            <div className="absolute inset-0 opacity-[0.04] mix-blend-overlay" style={{ backgroundImage: GRAIN, backgroundSize: "220px 220px" }} />
          </div>
          <div
            style={{ transform: "translateY(calc(var(--p, 0) * -60px)) scale(calc(1 - var(--p, 0) * 0.06))", opacity: "calc(1 - var(--p, 0) * 0.9)" }}
            className="relative z-10 mx-auto flex w-full max-w-5xl flex-1 flex-col items-center justify-center px-8 py-16 text-center"
          >
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

        </section>

        {catalog && (
          <>
            <Feature
              icon={Users}
              label="Heroes"
              href="/heroes"
              title="Every hero, down to the last voice line"
              frame={false}
              text={`${catalog.heroes.length} heroes, each on a page of its own: the model in 3D with its animations, its personas and abilities, its items by set, and every sound, effect and picture of it.`}
              points={[
                ["In 3D, as in the game", "The body in its default look, every persona, every animation, to turn and to download as glb."],
                ["Every line it says", "Voice lines grouped by when the game plays them: a kill, a deny, buying a Blink Dagger."],
                ["Items by set", "Each set worn on the hero, its models, textures and effects in one download."],
              ]}
            >
              <HeroStrip heroes={catalog.heroes} />
            </Feature>

            <Feature
              icon={Gift}
              label="Treasures"
              href="/cosmetics/treasures"
              title="Every chest, and what is inside it"
              text={`${n(stats?.treasures)} treasures and capsules with their contents and rare bonus drops, ${n(stats?.sets)} sets and ${n(stats?.bundles)} bundles, all linked: an item knows the chests it drops from and the bundles it comes in.`}
              points={[
                ["Contents and bonus drops", "What a chest gives, and its rare extras with the chance the game shows."],
                ["Where an item comes from", "The chests it drops from, the bundles it is sold in, the event it came with."],
                ["By year and event", `Battle passes and events with all they brought, ${n(stats?.events)} of them.`],
              ]}
            >
              <TreasurePanel catalog={catalog} />
            </Feature>

            <Feature
              icon={Box}
              label="3D models"
              href="/3d"
              title="Every model in the game"
              text={`${n(stats?.models)} models as glb with their textures: heroes, items, couriers, creeps, trees, rocks and buildings, sorted by type, theme and size.`}
              points={[
                ["Find one by a screenshot", "Drop a picture from the game and get the models that look like it."],
                ["Textures included", "Each model lists its textures, to download with it as one zip."],
                ["Rendered for you", "A preview of every model, as it stands and as the game camera sees it."],
              ]}
            >
              <ModelWall catalog={catalog} />
            </Feature>

            <Feature
              icon={Database}
              label="Files"
              href="/files"
              title="Take the files anywhere"
              text={`${n(stats?.files)} files in public datasets on Hugging Face, updated after each patch. Download one file, a folder or all of it, or show any hero and item in 3D on your own site.`}
            >
              <div className="grid gap-4 p-4 md:grid-cols-2 md:p-6">
                <Code title="Download a dataset" href={OWNER_URL} link="Hugging Face" lines={["pip install -U huggingface_hub", "hf download Sqls1/dota2-models --repo-type dataset"]} />
                <Code
                  title="Embed a hero in 3D"
                  href={DOTADEX}
                  link="Dotadex"
                  lines={[`<iframe src="${DOTADEX}/embed/hero/pudge"`, '  width="800" height="500"', '  style="border:0;border-radius:12px"></iframe>']}
                />
              </div>
            </Feature>
          </>
        )}

        {/* The last word: who makes it, and a way to help */}
        <section data-reveal className="relative mt-24 overflow-hidden px-8 py-32 text-center">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(40%_60%_at_50%_100%,rgba(178,34,24,0.22),transparent_70%)]" />
          <h2 className="relative text-[clamp(2.2rem,4vw,3.6rem)] leading-[1.05] font-semibold tracking-[-0.045em]">Made by one person</h2>
          <p className="relative mx-auto mt-5 max-w-xl text-[1.05rem] leading-relaxed text-balance text-ink-400">
            This site, Dotadex and the datasets behind them are built and kept running by hand. If they saved you time, you can help keep them going.
          </p>
          <div className="relative mt-9 flex flex-wrap justify-center gap-3">
            <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl bg-ink-100 px-6 text-[0.95rem] font-medium text-ink-950 transition-colors hover:bg-white">
              <Heart size={17} /> Support the author
            </a>
            <a href={SOURCE_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-xl border border-white/[0.1] bg-ink-900/80 px-6 text-[0.95rem] text-ink-100 transition-colors hover:border-white/25">
              <Code2 size={17} /> Source on GitHub
            </a>
          </div>
        </section>

        <footer className="border-t border-white/[0.06]">
          <div className="mx-auto grid max-w-[80rem] gap-10 px-8 py-14 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
            <div>
              <div className="text-[0.95rem] font-medium">Dotadex Files</div>
              <p className="mt-2 max-w-xs text-[0.86rem] leading-relaxed text-ink-400">Every file of Dota 2, sorted and free. Not affiliated with Valve; Dota 2 belongs to Valve Corporation.</p>
            </div>
            {[
              ["Browse", [["/heroes", "Heroes"], ["/sets", "Sets"], ["/bundles", "Bundles"], ["/cosmetics/treasures", "Treasures"], ["/music", "Music"]]],
              ["Files", [["/3d", "3D models"], ["/cosmetics", "Cosmetics"], ["/files", "Datasets"], [OWNER_URL, "Hugging Face"]]],
              ["Project", [[DOTADEX, "Dotadex"], [SOURCE_URL, "Source"], [SUPPORT_URL, "Support the author"]]],
            ].map(([head, links]) => (
              <div key={head}>
                <div className="text-[0.86rem] text-ink-400">{head}</div>
                <ul className="mt-3 space-y-2 text-[0.9rem]">
                  {links.map(([href, label]) => (
                    <li key={label}>
                      <a
                        href={href.startsWith("http") ? href : link(href)}
                        {...(href.startsWith("http") ? { target: "_blank", rel: "noreferrer" } : {})}
                        className="text-ink-300 transition-colors hover:text-ink-100"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </footer>
      </div>
    </div>
  );
}

// Hero icons drifting all over the opening, clear of the words in its middle: each at its own depth
// (the far ones smaller, fainter, a little blurred, moving less as the page scrolls), each on its own
// slow path. Placed by a seeded random, so the same each visit of a day
function HeroField({ heroes }) {
  const icons = useMemo(() => {
    let seed = Math.floor(Date.now() / 86400000);
    const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 5; i++) rand();
    const out = [];
    for (let tries = 0; out.length < 34 && tries < 2000; tries++) {
      const x = rand() * 100;
      const y = 8 + rand() * 84;
      // the words' ground: an ellipse in the middle
      if (((x - 50) / 31) ** 2 + ((y - 50) / 30) ** 2 < 1) continue;
      if (out.some((o) => Math.hypot((o.x - x) * 1.6, o.y - y) < 9)) continue;
      const depth = 0.25 + rand() * 0.75;
      out.push({
        x,
        y,
        depth,
        hero: heroes[Math.floor(rand() * heroes.length)],
        drift: `${9 + rand() * 9}s`,
        delay: `${-rand() * 18}s`,
        dx: `${(rand() - 0.5) * 280}px`,
        dy: `${(rand() - 0.5) * 180}px`,
        dx2: `${(rand() - 0.5) * 280}px`,
        dy2: `${(rand() - 0.5) * 180}px`,
        dr: `${(rand() - 0.5) * 30}deg`,
        spin: Math.round((rand() - 0.5) * 240),
      });
    }
    return out;
  }, [heroes]);
  return (
    <div aria-hidden="true" className="anim-fade pointer-events-none absolute inset-0 overflow-hidden">
      {icons.map((o, i) => (
        <div
          key={i}
          className="absolute"
          style={{
            left: `${o.x}%`,
            top: `${o.y}%`,
            // with the scroll (--p, 0 to 1) it flies out from the middle, turning and growing, the near ones faster
            transform: `translate(-50%, -50%) translate(calc(var(--p, 0) * ${(((o.x - 50) / 50) * 260 * o.depth).toFixed(0)}px), calc(var(--p, 0) * ${(((o.y - 50) / 50) * 220 * o.depth).toFixed(0)}px - var(--s, 0) * ${(0.5 * o.depth).toFixed(2)}px)) rotate(calc(var(--p, 0) * ${o.spin}deg)) scale(calc(1 + var(--p, 0) * ${(0.5 * o.depth).toFixed(2)}))`,
          }}
        >
          <img
            src={heroIcon(o.hero)}
            alt=""
            style={{
              "--drift": o.drift,
              "--dx": o.dx,
              "--dy": o.dy,
              "--dx2": o.dx2,
              "--dy2": o.dy2,
              "--dr": o.dr,
              animationDelay: o.delay,
              width: `${1.4 + o.depth * 2.2}rem`,
              opacity: 0.15 + o.depth * 0.55,
              filter: o.depth < 0.5 ? `blur(${((0.5 - o.depth) * 4).toFixed(1)}px)` : undefined,
            }}
            className="anim-drift block h-auto max-w-none"
          />
        </div>
      ))}
    </div>
  );
}

// A part of the site told the way a product page tells a feature: a small label, a heading, a few
// words, a large picture of the real thing, and under it the points that matter, side by side
function Feature({ icon: Icon, label, href, title, text, points = [], frame = true, children }) {
  return (
    <section data-reveal className="mx-auto mt-32 max-w-[80rem] px-8">
      <a href={link(href)} className="group inline-flex items-center gap-2 text-[0.92rem] text-ink-300 transition-colors hover:text-ink-100">
        <Icon size={16} /> {label} <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
      </a>
      <h2 className="mt-4 max-w-3xl text-[clamp(2rem,3.4vw,3rem)] leading-[1.06] font-semibold tracking-[-0.04em] text-balance">{title}</h2>
      <p className="mt-4 max-w-2xl text-[1.02rem] leading-relaxed text-ink-400">{text}</p>
      {frame ? (
        <div className="relative mt-10 overflow-hidden rounded-3xl border border-white/[0.07] bg-[linear-gradient(180deg,#17171a_0%,#0f0f11_100%)]">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
          <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(50%_100%_at_50%_0%,rgba(255,255,255,0.05),transparent)]" />
          <div className="relative">{children}</div>
        </div>
      ) : (
        <div className="mt-6">{children}</div>
      )}
      {points.length > 0 && (
        <div className="mt-10 grid gap-8 md:grid-cols-3">
          {points.map(([head, body]) => (
            <div key={head} className="border-t border-white/[0.08] pt-5">
              <h3 className="text-[0.98rem] font-medium">{head}</h3>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-ink-400">{body}</p>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

// A row of heroes standing in their default sets, the middle one in front; a different few each day
function HeroStrip({ heroes }) {
  const row = useMemo(() => {
    const day = Math.floor(Date.now() / 86400000);
    return Array.from({ length: 7 }, (_, i) => heroes[(day * 7 + i * 19) % heroes.length]);
  }, [heroes]);
  return (
    <div className="relative flex items-end justify-center [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
      {row.map((h, i) => {
        const far = Math.abs(i - 3);
        return (
          <a
            key={h.id}
            href={link(`/hero/${h.key}`)}
            title={h.name}
            style={{ height: `${32 - far * 3}rem`, zIndex: 10 - far }}
            className="group relative -mx-6 flex min-w-0 flex-1 flex-col items-center justify-end"
          >
            <img
              src={heroCard(h)}
              alt={h.name}
              loading="lazy"
              className={`h-full w-auto max-w-none object-contain object-bottom mix-blend-lighten transition-transform duration-500 [mask-image:linear-gradient(to_bottom,black_82%,transparent)] group-hover:-translate-y-2 ${far ? "opacity-75 group-hover:opacity-100" : ""}`}
            />
            <span className="absolute -bottom-7 text-[0.82rem] text-ink-300 opacity-0 transition-opacity group-hover:opacity-100">{h.name}</span>
          </a>
        );
      })}
    </div>
  );
}

// The latest chest that gives several things: its picture and name, and what drops from it, each with
// its rarity's colour
function TreasurePanel({ catalog }) {
  const chest = useMemo(
    () =>
      Object.values(catalog.items)
        .filter((i) => i.loot && i.icon && i.loot.drops.filter((d) => catalog.items[d]?.icon).length >= 6)
        .sort((a, b) => (b.date || "").localeCompare(a.date || ""))[0],
    [catalog]
  );
  if (!chest) return null;
  const drops = chest.loot.drops.map((d) => catalog.items[d]).filter((d) => d?.icon).slice(0, 12);
  const bonus = chest.loot.bonus.map(([d]) => catalog.items[d]).filter((d) => d?.icon).slice(0, 4);
  const cell = (item) => (
    <button
      key={item.id}
      onClick={() => openItem(item.id, drops.map((d) => d.id))}
      title={item.name}
      className="group relative aspect-[4/3] overflow-hidden rounded-xl border border-white/[0.06] bg-ink-850 transition-colors hover:border-white/20"
    >
      <img src={imageUrl(item.icon)} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.05]" />
      <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: catalog.rarities[item.rarity || "common"]?.color || "transparent" }} />
    </button>
  );
  return (
    <div className="grid gap-8 p-6 md:grid-cols-[18rem_1fr] md:p-10">
      <button onClick={() => openItem(chest.id)} className="flex flex-col items-center text-center">
        <img src={imageUrl(chest.icon)} alt="" className="w-full max-w-[16rem] rounded-2xl" />
        <span className="mt-4 text-[1.02rem] font-medium">{chest.name}</span>
        <span className="mt-1 text-[0.84rem] text-ink-400">
          {chest.date?.slice(0, 4)}, {chest.loot.drops.length} items inside
        </span>
      </button>
      <div>
        <div className="text-[0.86rem] text-ink-400">Contents</div>
        <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{drops.map(cell)}</div>
        {bonus.length > 0 && (
          <>
            <div className="mt-6 text-[0.86rem] text-ink-400">Rare bonus drops</div>
            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">{bonus.map(cell)}</div>
          </>
        )}
      </div>
    </div>
  );
}

// The site's renders of the latest models, a wall of them on a dark floor
function ModelWall({ catalog }) {
  const cards = useMemo(() => {
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
      if (out.length === 12) break;
    }
    return out;
  }, [catalog]);
  return (
    <div className="grid grid-cols-3 gap-px bg-white/[0.04] sm:grid-cols-4 lg:grid-cols-6">
      {cards.map(([item, url]) => (
        <button
          key={item.id}
          onClick={() => openItem(item.id, cards.map(([x]) => x.id))}
          title={item.name}
          className="group flex aspect-square items-center justify-center bg-[radial-gradient(circle_at_50%_60%,#1f1f23_0%,#111113_75%)] p-5"
        >
          <img src={url} alt="" loading="lazy" onError={(e) => (e.currentTarget.style.visibility = "hidden")} className="h-full w-full object-contain transition-transform duration-500 group-hover:scale-[1.08]" />
        </button>
      ))}
    </div>
  );
}

// A few lines of code in a terminal-like panel, copied with a click
function Code({ title, href, link: label, lines }) {
  const [done, setDone] = useState(false);
  return (
    <div className="flex flex-col overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-950">
      <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3">
        <span className="text-[0.88rem] font-medium">{title}</span>
        <a href={href} target="_blank" rel="noreferrer" className="ml-auto inline-flex items-center gap-1 text-[0.82rem] text-ink-400 hover:text-ink-100">
          {label} <ArrowRight size={13} />
        </a>
        <button
          onClick={async () => {
            await navigator.clipboard.writeText(lines.join("\n"));
            setDone(true);
            setTimeout(() => setDone(false), 1400);
          }}
          title="Copy"
          className="text-ink-400 hover:text-ink-100"
        >
          {done ? <Check size={15} /> : <Copy size={15} />}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 font-mono text-[0.8rem] leading-relaxed text-ink-300">
        {lines.map((l, i) => (
          <div key={i}>
            <span className="mr-3 text-ink-600 select-none">{i + 1}</span>
            {l}
          </div>
        ))}
      </pre>
    </div>
  );
}
