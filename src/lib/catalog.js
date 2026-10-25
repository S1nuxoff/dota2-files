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

// Size classes by a model's longest side, in the units the models are exported in (a hero is about 4)
export const SIZES = [
  ["tiny", "Tiny", 0.5],
  ["small", "Small", 2],
  ["medium", "Medium", 6],
  ["large", "Large", 20],
  ["huge", "Huge", Infinity],
];
export const sizeOf = (dims) => (dims ? SIZES.find(([, , max]) => Math.max(...dims) < max)[0] : "");
