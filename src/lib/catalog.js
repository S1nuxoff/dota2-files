import { useEffect, useState } from "react";
import { DATASETS, datasetById, fileUrl } from "../datasets.js";

// The tracker's catalog (dota2-game-tracker exporters/catalog.js): heroes with the tokens that name
// their files, every item of items_game with its files as path prefixes per dataset, sets, rarities.
// npm run dev reads a local copy from public/dev/ when there is one (a catalog not yet uploaded).
let promise = null;
let prefabNames = {};

async function fetchCatalog() {
  if (import.meta.env.DEV) {
    const local = await fetch("./dev/catalog.json").catch(() => null);
    if (local?.ok && local.headers.get("content-type")?.includes("json")) return local.json();
  }
  const res = await fetch(`${fileUrl(datasetById("data"), "catalog/catalog.json")}.gz`);
  if (!res.ok || !res.body) throw new Error(`${res.status} catalog`);
  return new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
}

export function loadCatalog() {
  promise ??= fetchCatalog().then((catalog) => {
    for (const [id, item] of Object.entries(catalog.items)) item.id = id;
    for (const hero of catalog.heroes) hero.key = hero.id.slice("npc_dota_hero_".length);
    catalog.heroByKey = new Map(catalog.heroes.map((h) => [h.key, h]));
    catalog.heroById = new Map(catalog.heroes.map((h) => [h.id, h]));
    // Sets: each with its key and its hero (its items' first); each hero with its sets
    catalog.setByKey = new Map();
    for (const [key, set] of Object.entries(catalog.sets || {})) {
      set.key = key;
      set.items = set.items.filter((id) => catalog.items[id]);
      const heroId = set.items.map((id) => catalog.items[id].heroes.find((h) => h.startsWith("npc_dota_hero_"))).find(Boolean);
      set.hero = heroId ? catalog.heroById.get(heroId) : null;
      if (set.items.length) catalog.setByKey.set(key, set);
    }
    for (const hero of catalog.heroes) hero.sets = [];
    for (const set of catalog.setByKey.values()) set.hero?.sets.push(set);
    // Where an item drops: the treasures whose loot names it
    catalog.foundIn = new Map();
    for (const item of Object.values(catalog.items)) {
      if (!item.loot) continue;
      for (const id of [...item.loot.drops, ...item.loot.bonus.map(([b]) => b)]) {
        if (!catalog.foundIn.has(id)) catalog.foundIn.set(id, []);
        if (!catalog.foundIn.get(id).includes(item.id)) catalog.foundIn.get(id).push(item.id);
      }
    }
    // The bundles an item comes in
    catalog.inBundles = new Map();
    for (const item of Object.values(catalog.items)) for (const id of item.bundle || []) (catalog.inBundles.get(id) || catalog.inBundles.set(id, []).get(id)).push(item.id);
    prefabNames = catalog.prefabs || {};
    return catalog;
  });
  promise.catch(() => (promise = null));
  return promise;
}

export function useCatalog() {
  const [state, setState] = useState({ catalog: null, error: "" });
  useEffect(() => {
    loadCatalog().then(
      (catalog) => setState({ catalog, error: "" }),
      (e) => setState({ catalog: null, error: String(e.message || e) })
    );
  }, []);
  return state;
}

export const heroPortrait = (hero) => fileUrl(datasetById("images"), `panorama/images/heroes/${hero.id}_png.png`);
export const imageUrl = (path) => (path ? fileUrl(datasetById("images"), path) : "");

// A whole map of the game: scenes/<name>.glb in dota2-maps (the scenes of the menus and events sit
// in folders), a few hundred MB
export const isWholeMap = (e) => e.ds === "maps" && /^scenes\/[^/]+\.glb$/.test(e.path);

// The map the terrains are laid over: the whole map most terrain items name
const bases = new WeakMap();
export function baseMap(catalog) {
  if (!bases.has(catalog)) {
    const named = new Map();
    for (const it of Object.values(catalog.items))
      if (it.prefab === "terrain") for (const p of it.refs.maps || []) if (isWholeMap({ ds: "maps", path: p })) named.set(p, (named.get(p) || 0) + 1);
    bases.set(catalog, [...named].sort((a, b) => b[1] - a[1])[0]?.[0] || "");
  }
  return bases.get(catalog);
}

// A terrain's whole map: its own, else (the default terrain) the base map
export function terrainMap(item, catalog) {
  if (item.prefab !== "terrain") return "";
  const base = baseMap(catalog);
  return (item.refs.maps || []).find((p) => p !== base && isWholeMap({ ds: "maps", path: p })) || base;
}

// A set's files: every file of every item of it
export function setFiles(set, catalog, indexes, withCopies) {
  const out = new Map();
  for (const id of set.items) filesOfRefs(catalog.items[id].refs, indexes, withCopies, out);
  return [...out.values()];
}

// The models a set puts on its hero: one per item (its first, the default style's)
export function setModels(set, catalog, indexes) {
  if (!indexes.models) return [];
  const byPath = new Map(indexes.models.entries.map((e) => [e.path, e]));
  return set.items.map((id) => (catalog.items[id].refs.models || []).map((pre) => byPath.get(`${pre}glb`)).find(Boolean)).filter(Boolean);
}

// The set on its hero in Dotadex: hero/<hero>?<slot>=<item>&... (a persona's slots switch to it)
export function setDotadexPath(set, catalog) {
  if (!set.hero) return "";
  const params = new URLSearchParams();
  let persona = 0;
  for (const id of set.items) {
    const slot = catalog.items[id].slotKey;
    if (!slot) continue;
    params.set(slot, id);
    const m = /_persona_(\d+)$/.exec(slot);
    if (m) persona = Number(m[1]);
  }
  if (persona) params.set("persona", persona);
  return `hero/${set.hero.key}?${params}`;
}
// The items a file belongs to: those with a ref (a path prefix) it starts with; an index of every
// item's prefixes per dataset, made at the first question
const owners = new WeakMap();
export function ownersOf(catalog, ds, path) {
  if (!owners.has(catalog)) {
    const byDs = {};
    for (const item of Object.values(catalog.items)) for (const [d, prefixes] of Object.entries(item.refs)) for (const p of prefixes) (byDs[d] ??= []).push([p, item.id]);
    owners.set(catalog, byDs);
  }
  const ids = [];
  for (const [p, id] of owners.get(catalog)[ds] || []) if (path.startsWith(p) && !ids.includes(id)) ids.push(id);
  return ids;
}

// An item's files with a bundle's: the bundle has only its picture, its items the models
export function itemFiles(item, catalog, indexes, withCopies) {
  const out = filesOfRefs(item.refs, indexes, withCopies);
  for (const id of item.bundle || []) if (catalog.items[id]) filesOfRefs(catalog.items[id].refs, indexes, withCopies, out);
  return [...out.values()];
}

// Where Dotadex shows an item: a bundle on its hero wearing all of it, else the item itself
export function itemDotadexPath(item, catalog) {
  if (item.bundle) {
    const heroId = item.bundle.map((id) => catalog.items[id]?.heroes.find((h) => h.startsWith("npc_dota_hero_"))).find(Boolean);
    const hero = heroId && catalog.heroById.get(heroId);
    if (hero) return setDotadexPath({ hero, items: item.bundle.filter((id) => catalog.items[id]) }, catalog);
  }
  return `item/${item.id}`;
}

// The hero standing whole in its default set, as the game's set pages show it (448 x 678)
export const heroCard = (hero) => fileUrl(datasetById("images"), `panorama/images/econ/sets/v2/${hero.id}_0_png.png`);

function lowerBound(entries, prefix) {
  let lo = 0;
  let hi = entries.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (entries[mid].path < prefix) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

// The entries of the datasets under the prefixes of refs ({ <dataset>: [prefix] })
export function filesOfRefs(refs, indexes, withCopies, out = new Map()) {
  for (const [ds, prefixes] of Object.entries(refs)) {
    const index = indexes[ds];
    if (!index) continue;
    for (const prefix of prefixes) {
      for (let i = lowerBound(index.entries, prefix); i < index.entries.length && index.entries[i].path.startsWith(prefix); i++) {
        const e = index.entries[i];
        if (withCopies || !e.copy) out.set(`${ds}:${e.path}`, e);
      }
    }
  }
  return out;
}

// A hero's files: a folder named by one of its tokens (models/heroes/invoker/, sounds/vo/invoker/,
// particles/units/heroes/hero_invoker/), a file named after the hero (npc_dota_hero_invoker*) or
// starting with a token or an ability (invoker_quas_png.png), and every file of its items
export function heroFiles(hero, catalog, indexes, withCopies) {
  const tokens = new Set(hero.tokens);
  const starts = [...hero.tokens, ...hero.abilities];
  const npc = hero.id;
  const out = new Map();
  for (const ds of DATASETS) {
    const index = indexes[ds.id];
    if (!index) continue;
    for (const e of index.entries) {
      if (e.copy && !withCopies) continue;
      const p = e.path;
      // The tracker's pictures of models are the site's, not the hero's files
      if (p.startsWith("previews/")) continue;
      const cut = p.lastIndexOf("/");
      const file = p.slice(cut + 1);
      let hit = false;
      const at = file.indexOf(npc);
      if (at >= 0) {
        const next = file[at + npc.length];
        hit = next === undefined || next === "_" || next === ".";
      }
      if (!hit) {
        for (const s of starts) {
          if (file.startsWith(s) && (file[s.length] === "_" || file[s.length] === ".")) {
            hit = true;
            break;
          }
        }
      }
      if (!hit && cut > 0) {
        for (const seg of p.slice(0, cut).split("/")) {
          if (tokens.has(seg) || (seg.startsWith("hero_") && tokens.has(seg.slice(5)))) {
            hit = true;
            break;
          }
        }
      }
      if (hit) out.set(`${ds.id}:${p}`, e);
    }
  }
  for (const id of hero.items) {
    const item = catalog.items[id];
    if (item) filesOfRefs(item.refs, indexes, withCopies, out);
  }
  return [...out.values()];
}

// The game's name of a kind of item (catalog.prefabs), else its own words
export const prefabTitle = (prefab) => prefabNames[prefab] || (prefab || "other").replace(/_/g, " ");

// The tracker's list of every 3D model (catalog/models.json): rows of the fields it names, with
// texture paths as indexes into its own list. npm run dev reads public/dev/models.json when there is one
let modelsPromise = null;

export function loadModels() {
  modelsPromise ??= (async () => {
    let data = null;
    if (import.meta.env.DEV) {
      const local = await fetch("./dev/models.json").catch(() => null);
      if (local?.ok && local.headers.get("content-type")?.includes("json")) data = await local.json();
    }
    if (!data) {
      const res = await fetch(`${fileUrl(datasetById("data"), "catalog/models.json")}.gz`);
      if (!res.ok || !res.body) throw new Error(`${res.status} models`);
      data = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
    }
    const at = Object.fromEntries(data.fields.map((f, i) => [f, i]));
    return data.models.map((r) => ({
      ds: r[at.dataset],
      path: r[at.path],
      type: r[at.type],
      group: r[at.group],
      theme: r[at.theme],
      hero: r[at.hero],
      item: r[at.item],
      dims: r[at.width] == null ? null : [r[at.width], r[at.height], r[at.depth]],
      triangles: r[at.triangles],
      animations: r[at.animations],
      variant: r[at.variant],
      textures: r[at.textures].map((i) => data.textures[i]),
    }));
  })();
  modelsPromise.catch(() => (modelsPromise = null));
  return modelsPromise;
}

// When each sound plays (catalog/sounds.json): per file its sound event and the talker rules that
// speak it, each a concept (Killing a hero) and conditions (Target: Pudge, 25% chance), in words.
// Gives a Map of path -> { event, rules: [{ concept, conditions }] }
let soundsPromise = null;

export function loadSounds() {
  soundsPromise ??= (async () => {
    let data = null;
    if (import.meta.env.DEV) {
      const local = await fetch("./dev/sounds.json").catch(() => null);
      if (local?.ok && local.headers.get("content-type")?.includes("json")) data = await local.json();
    }
    if (!data) {
      const res = await fetch(`${fileUrl(datasetById("data"), "catalog/sounds.json")}.gz`);
      if (!res.ok || !res.body) throw new Error(`${res.status} sounds`);
      data = await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
    }
    const rules = data.rules.map(([c, conds]) => ({ concept: data.concepts[c], conditions: conds.map((i) => data.conditions[i]) }));
    return new Map(Object.entries(data.files).map(([path, [event, r]]) => [path, { event, rules: r.map((i) => rules[i]) }]));
  })();
  soundsPromise.catch(() => (soundsPromise = null));
  return soundsPromise;
}

// Size classes by a model's longest side, in the units the models are exported in (a hero is about 4)
export const SIZES = [
  ["tiny", "Tiny", 0.5],
  ["small", "Small", 2],
  ["medium", "Medium", 6],
  ["large", "Large", 20],
  ["huge", "Huge", Infinity],
];
export const sizeOf = (dims) => (dims ? SIZES.find(([, , max]) => Math.max(...dims) < max)[0] : "");

// The game's icon of a hero's primary attribute (Strength, Agility, Intelligence, Universal)
const ATTRIBUTE_FILES = { Strength: "strength", Agility: "agility", Intelligence: "intelligence", Universal: "all" };
export const ATTRIBUTES = Object.keys(ATTRIBUTE_FILES);
export const attributeIcon = (attribute) =>
  ATTRIBUTE_FILES[attribute] ? fileUrl(datasetById("images"), `panorama/images/primary_attribute_icons/primary_attribute_icon_${ATTRIBUTE_FILES[attribute]}_psd.png`) : "";

// The hero's portrait of the game's hero picker: 142 x 188, light (about 15 KB), as the cards of a grid
export const heroSelection = (hero) => fileUrl(datasetById("images"), `panorama/images/heroes/selection/${hero.id}_png.png`);
