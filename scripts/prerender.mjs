// After vite build: a page of its own for every hero, item, kind of item and section, so search
// engines and link previews see each one (title, description, picture, text, links) without running
// the app; the app takes over the page when it starts. Also sitemap.xml, robots.txt, and 404.html
// (GitHub Pages answers every other address with it, and the app shows that page).
//
//   SITE_URL=https://s1nuxoff.github.io/dota2-files node scripts/prerender.mjs
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const DIST = "dist";
const BASE = process.env.BASE_PATH || "/dota2-files/";
const SITE = (process.env.SITE_URL || `https://s1nuxoff.github.io${BASE}`).replace(/\/$/, "");
const HF = "https://huggingface.co/datasets/Sqls1";
const SITE_NAME = "Dotadex Files";

// Kinds of item that are not things to download (tools, tickets, recipes): no page of their own
const SKIP_PREFABS = new Set(["tool", "league", "sticker", "sticker_capsule", "player_card", "dynamic_recipe", "key", "socket_gem", "emoticon_tool"]);

const DATASETS = [
  ["images", "Images", "Every picture of the Dota 2 interface: hero portraits, item icons, ability icons, loading screens, emoticons."],
  ["models", "Models", "Every Dota 2 model as glb with textures and animations: heroes, cosmetics, units, props."],
  ["textures", "Textures", "Every Dota 2 texture on its own as PNG: color, normal, mask maps of heroes, items and the world."],
  ["sounds", "Sounds", "Every Dota 2 sound: voice lines, music, ability and interface sounds."],
  ["videos", "Videos", "Dota 2 interface videos: animated hero portraits and intros."],
  ["particles", "Particles", "Every Dota 2 particle system as JSON with its textures."],
  ["maps", "Maps", "Dota 2 scenes and maps as glb."],
  ["data", "Data", "Every Dota 2 script and localization as JSON, Panorama layouts and styles."],
];

async function getJson(repo, file) {
  const res = await fetch(`${HF}/${repo}/resolve/main/${file}.gz`);
  if (!res.ok) throw new Error(`${repo}/${file}: ${res.status}`);
  return JSON.parse(zlib.gunzipSync(Buffer.from(await res.arrayBuffer())));
}

const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fileUrl = (repo, file) => `${HF}/${repo}/resolve/main/${file.split("/").map(encodeURIComponent).join("/")}`;
// Pages end with "/" as GitHub Pages serves them (the address without it is redirected); files do not
const slash = (p) => (p === "/" || /\.\w+$/.test(p) ? p.replace(/^\/+/, "") : `${p.replace(/^\/+/, "").replace(/\/$/, "")}/`);
const url = (p) => `${SITE}/${slash(p)}`;
const href = (p) => `${BASE}${slash(p)}`;
const words = (s) => s.replace(/_/g, " ");

const template = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
fs.writeFileSync(path.join(DIST, "404.html"), template);

const pages = [];

// One page: its head (title, description, canonical, Open Graph, Twitter, JSON-LD) and its text in #root
function page(p, { title, description, image, body, jsonld }) {
  const full = p === "/" ? title : `${title} | ${SITE_NAME}`;
  const head = [
    `<title>${esc(full)}</title>`,
    `<meta name="description" content="${esc(description)}" />`,
    `<link rel="canonical" href="${esc(url(p))}" />`,
    `<meta property="og:site_name" content="${SITE_NAME}" />`,
    `<meta property="og:type" content="website" />`,
    `<meta property="og:title" content="${esc(full)}" />`,
    `<meta property="og:description" content="${esc(description)}" />`,
    `<meta property="og:url" content="${esc(url(p))}" />`,
    image ? `<meta property="og:image" content="${esc(image)}" />` : "",
    `<meta name="twitter:card" content="${image ? "summary_large_image" : "summary"}" />`,
    jsonld ? `<script type="application/ld+json">${JSON.stringify(jsonld).replace(/</g, "\\u003c")}</script>` : "",
  ]
    .filter(Boolean)
    .join("\n    ");
  const html = template
    .replace(/<title>[^<]*<\/title>/, head)
    .replace(/<meta name="description"[^>]*>\s*/, "")
    .replace('<div id="root"></div>', `<div id="root"><main style="max-width:60rem;margin:auto;padding:2rem;font-family:system-ui;color:#e6e8ee">${body}</main></div>`);
  const file = path.join(DIST, ...p.split("/").filter(Boolean).map(decodeURIComponent), "index.html");
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, html);
  pages.push(p);
}

const list = (items) => `<ul>${items.map(([p, text]) => `<li><a href="${esc(href(p))}">${esc(text)}</a></li>`).join("")}</ul>`;
const game = { "@type": "VideoGame", name: "Dota 2", publisher: "Valve" };

const catalog = await getJson("dota2-data", "catalog/catalog.json");
const heroByKey = new Map(catalog.heroes.map((h) => [h.id.slice("npc_dota_hero_".length), h]));
const heroKey = (id) => id.slice("npc_dota_hero_".length);
const portrait = (h) => fileUrl("dota2-images", `panorama/images/heroes/${h.id}_png.png`);
const icon = (item) => (item.icon ? fileUrl("dota2-images", item.icon) : "");
const prefabTitle = (p) => catalog.prefabs?.[p] || words(p);
const itemPages = Object.entries(catalog.items).filter(([, it]) => !SKIP_PREFABS.has(it.prefab));

// Home: the heroes
page("/", {
  title: "Dotadex Files: download every Dota 2 model, texture, sound and icon",
  description: `Browse and download every file of Dota 2: ${catalog.heroes.length} heroes with their 3D models, ${itemPages.length.toLocaleString("en-US")} cosmetic items, textures, sounds, voice lines, particles and icons. Free, straight from the game files.`,
  image: portrait(catalog.heroes[0]),
  body: `<h1>Every file of Dota 2</h1><p>Heroes with all their 3D models, items, sounds and effects; every cosmetic; every 3D model, texture, picture, video and script of the game, ready to download.</p><h2>Heroes</h2>${list(catalog.heroes.map((h) => [`/hero/${heroKey(h.id)}`, h.name]))}`,
  jsonld: { "@context": "https://schema.org", "@type": "WebSite", name: SITE_NAME, url: url("/"), about: game },
});

for (const h of catalog.heroes) {
  const key = heroKey(h.id);
  const items = h.items.map((id) => [id, catalog.items[id]]).filter(([, it]) => it && !SKIP_PREFABS.has(it.prefab));
  const personas = h.personas.map((p) => p.name).join(", ");
  page(`/hero/${key}`, {
    title: `${h.name}: 3D models, items, textures and sounds`,
    description: `Download ${h.name} from Dota 2: the 3D model (glb) with animations${personas ? `, personas (${personas})` : ""}, ${items.length} cosmetic items, textures, voice lines, sounds, particles and icons.`,
    image: portrait(h),
    body: `<h1>${esc(h.name)}</h1><img src="${esc(portrait(h))}" alt="${esc(h.name)}" width="256" /><p>${esc(h.name)}'s 3D model with animations, its default look and personas${personas ? ` (${esc(personas)})` : ""}, ${items.length} cosmetic items, and every texture, sound, voice line, particle effect and picture of the hero in Dota 2.</p><h2>Items</h2>${list(items.map(([id, it]) => [`/item/${id}`, it.name]))}<p><a href="${esc(href("/"))}">All heroes</a></p>`,
    jsonld: { "@context": "https://schema.org", "@type": "CreativeWork", name: `${h.name} (Dota 2)`, image: portrait(h), url: url(`/hero/${key}`), isPartOf: game },
  });
}

for (const [id, it] of itemPages) {
  const heroes = it.heroes.filter((x) => x.startsWith("npc_dota_hero_")).map((x) => heroByKey.get(heroKey(x))).filter(Boolean);
  const kind = it.type || it.slot || prefabTitle(it.prefab);
  const rarity = catalog.rarities[it.rarity || "common"]?.name || "";
  const forHero = heroes.length ? ` for ${heroes.map((h) => h.name).join(", ")}` : "";
  const hasModel = Boolean(it.refs.models);
  const set = it.set && catalog.sets[it.set];
  const what = [hasModel && "3D model (glb)", it.refs.textures && "textures", it.icon && "icon", it.refs.particles && "particle effects", it.refs.sounds && "sounds"].filter(Boolean);
  page(`/item/${id}`, {
    title: `${it.name}${forHero ? ` (${heroes[0].name})` : ""}: ${hasModel ? "3D model and textures" : "icon and files"}`,
    description: `${[rarity, kind].filter(Boolean).join(" ")}${forHero} in Dota 2. Download the ${what.join(", ") || "files"} of ${it.name}.`,
    image: icon(it),
    body: `<h1>${esc(it.name)}</h1>${it.icon ? `<img src="${esc(icon(it))}" alt="${esc(it.name)}" width="256" />` : ""}<p>${esc([rarity, kind].filter(Boolean).join(" "))}${esc(forHero)}. Files: ${esc(what.join(", ") || "none")}.</p>${heroes.map((h) => `<p><a href="${esc(href(`/hero/${heroKey(h.id)}`))}">${esc(h.name)}</a></p>`).join("")}${set ? `<h2>Set: ${esc(set.name)}</h2>${list(set.items.filter((x) => catalog.items[x] && x !== id).map((x) => [`/item/${x}`, catalog.items[x].name]))}` : ""}`,
    jsonld: { "@context": "https://schema.org", "@type": "CreativeWork", name: it.name, image: icon(it) || undefined, url: url(`/item/${id}`), isPartOf: game },
  });
}

// Sets: each on its hero, with its items
const setHero = (set) => {
  const id = set.items.map((x) => catalog.items[x]?.heroes.find((h) => h.startsWith("npc_dota_hero_"))).find(Boolean);
  return id ? heroByKey.get(heroKey(id)) : null;
};
for (const [key, set] of Object.entries(catalog.sets || {})) {
  const items = set.items.filter((x) => catalog.items[x]);
  // A key a file can be named after (a few have ":" or "?"): the others open through 404.html
  if (!items.length || !/^[\w'.,()&+-]+$/.test(key)) continue;
  const hero = setHero(set);
  const picture = set.icon ? fileUrl("dota2-images", set.icon) : "";
  page(`/set/${encodeURIComponent(key)}`, {
    title: `${set.name}${hero ? ` (${hero.name})` : ""}: set 3D models and textures`,
    description: `${set.name}, a ${items.length}-item Dota 2 set${hero ? ` for ${hero.name}` : ""}. Download the 3D models (glb), textures and icons of every item, or the whole set at once.`,
    image: picture,
    body: `<h1>${esc(set.name)}</h1>${picture ? `<img src="${esc(picture)}" alt="${esc(set.name)}" width="224" />` : ""}<p>${items.length} items${hero ? ` for <a href="${esc(href(`/hero/${heroKey(hero.id)}`))}">${esc(hero.name)}</a>` : ""}.</p>${list(items.map((x) => [`/item/${x}`, catalog.items[x].name]))}`,
    jsonld: { "@context": "https://schema.org", "@type": "CreativeWork", name: set.name, image: picture || undefined, url: url(`/set/${encodeURIComponent(key)}`), isPartOf: game },
  });
}

const byPrefab = new Map();
for (const [id, it] of itemPages) {
  if (!byPrefab.has(it.prefab)) byPrefab.set(it.prefab, []);
  byPrefab.get(it.prefab).push([id, it]);
}
page("/cosmetics", {
  title: "Dota 2 cosmetics: couriers, wards, loading screens and more",
  description: "Every Dota 2 cosmetic by kind: couriers, wards, loading screens, music packs, announcers, HUD skins, cursors, terrains, taunts and hero items, with 3D models and icons to download.",
  body: `<h1>Cosmetics</h1>${list([...byPrefab.entries()].sort((a, b) => b[1].length - a[1].length).map(([p, its]) => [`/cosmetics/${p}`, `${prefabTitle(p)} (${its.length})`]))}`,
});
for (const [prefab, its] of byPrefab) {
  const title = prefabTitle(prefab);
  page(`/cosmetics/${prefab}`, {
    title: `Dota 2 ${title}: every one, with 3D models and icons`,
    description: `All ${its.length} Dota 2 ${title} cosmetics with their 3D models, textures and icons to download.`,
    body: `<h1>${esc(title)}</h1>${list(its.slice(0, 1000).map(([id, it]) => [`/item/${id}`, it.name]))}`,
  });
}

page("/3d", {
  title: "Every Dota 2 3D model: heroes, items, creeps, props, scenes",
  description: "Browse and download every Dota 2 3D model as glb with textures and animations: heroes, cosmetics, couriers, creeps, trees, rocks, buildings and scenes, by type, theme, size and hero.",
  body: "<h1>3D models</h1><p>Every model of Dota 2 as glb with its textures and animations, sorted by type (heroes, cosmetics, units, world, effects, scenes), theme, size and hero.</p>",
});
page("/files", {
  title: "Dota 2 game files: every dataset",
  description: "Every Dota 2 file in eight datasets: images, models, textures, sounds, videos, particles, maps and data, by folder, with search and downloads.",
  body: `<h1>All files</h1>${list(DATASETS.map(([id, title]) => [`/${id}`, title]))}`,
});
for (const [id, title, description] of DATASETS) {
  page(`/${id}`, { title: `Dota 2 ${title.toLowerCase()}: download by folder`, description, body: `<h1>${esc(title)}</h1><p>${esc(description)}</p>` });
}

// sitemap.xml (one file holds up to 50,000 addresses; more go to several, listed by an index)
const today = new Date().toISOString().slice(0, 10);
const chunks = [];
for (let i = 0; i < pages.length; i += 45000) chunks.push(pages.slice(i, i + 45000));
const urlset = (ps) =>
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${ps.map((p) => `<url><loc>${esc(url(p))}</loc><lastmod>${today}</lastmod></url>`).join("\n")}\n</urlset>\n`;
if (chunks.length === 1) {
  fs.writeFileSync(path.join(DIST, "sitemap.xml"), urlset(chunks[0]));
} else {
  chunks.forEach((ps, i) => fs.writeFileSync(path.join(DIST, `sitemap-${i + 1}.xml`), urlset(ps)));
  fs.writeFileSync(
    path.join(DIST, "sitemap.xml"),
    `<?xml version="1.0" encoding="UTF-8"?>\n<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${chunks.map((_, i) => `<sitemap><loc>${esc(url(`/sitemap-${i + 1}.xml`))}</loc><lastmod>${today}</lastmod></sitemap>`).join("\n")}\n</sitemapindex>\n`
  );
}
// Search engines read robots.txt only at a domain's root: it takes effect once the site has a domain of its own
fs.writeFileSync(path.join(DIST, "robots.txt"), `User-agent: *\nAllow: /\nSitemap: ${url("/sitemap.xml")}\n`);
console.log(`prerender: ${pages.length} pages, sitemap of ${chunks.length} file(s)`);
