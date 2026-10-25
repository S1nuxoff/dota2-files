import MiniSearch from "minisearch";
import { DATASETS } from "../datasets.js";

// Search that forgives: names found with typos and by their beginnings, ranked, and the words of a
// query put right against the words the files are named with, before the files are searched

const split = (s) => s.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

// Heroes, sets and items by their names, the game's own names of them (npc_dota_hero_nevermore,
// the hero's folders) and their heroes' names. Built once per catalog
const names = new WeakMap();
function namesOf(catalog) {
  if (names.has(catalog)) return names.get(catalog);
  const index = new MiniSearch({
    idField: "key",
    fields: ["name", "aliases", "hero", "tags"],
    storeFields: ["kind", "ref"],
    tokenize: split,
    searchOptions: { boost: { name: 3, aliases: 2, hero: 1.5 }, prefix: true, fuzzy: 0.25, combineWith: "AND" },
  });
  const docs = [];
  for (const h of catalog.heroes) docs.push({ key: `h:${h.id}`, kind: "hero", ref: h.key, name: h.name, aliases: [h.key, ...h.tokens, ...(h.personas || []).map((p) => p.name)].join(" ") });
  for (const set of catalog.setByKey.values()) docs.push({ key: `s:${set.key}`, kind: "set", ref: set.key, name: set.name, aliases: set.key, hero: set.hero?.name || "" });
  // an item also by its hero (name and the game's key: antimage), its slot, kind and rarity, its event
  for (const item of Object.values(catalog.items)) {
    if (item.prefab === "bundle") continue;
    const heroes = item.heroes.map((id) => catalog.heroById.get(id)).filter(Boolean);
    const hero = heroes.map((h) => `${h.name} ${h.key}`).join(" ");
    const tags = [item.slot, item.type, item.prefab.replace(/_/g, " "), catalog.rarities[item.rarity]?.name, catalog.events?.[item.event]].filter(Boolean).join(" ");
    docs.push({ key: `i:${item.id}`, kind: "item", ref: item.id, name: item.name, hero, tags });
  }
  index.addAll(docs);
  names.set(catalog, index);
  return index;
}

// Heroes, sets and items for a query, best first: { heroes, sets, items } of the catalog's own objects
export function searchNames(catalog, query) {
  const index = namesOf(catalog);
  // every word if it can, else any of them
  let found = index.search(query);
  if (!found.length) found = index.search(query, { combineWith: "OR" });
  const out = { heroes: [], sets: [], items: [] };
  for (const r of found) {
    if (r.kind === "hero") {
      const h = catalog.heroByKey.get(r.ref);
      if (h) out.heroes.push(h);
    } else if (r.kind === "set") {
      const s = catalog.setByKey.get(r.ref);
      if (s) out.sets.push(s);
    } else {
      const i = catalog.items[r.ref];
      if (i) out.items.push(i);
    }
  }
  return out;
}

// Every word the files are named with (and the words of their titles), to put a query's words right
let words = null;
let wordsFrom = null;
function wordsOf(indexes) {
  if (words && wordsFrom === indexes) return words;
  const seen = new Set();
  for (const d of DATASETS) for (const e of indexes[d.id]?.entries || []) for (const w of split(e.hay)) if (w.length > 2 && !/^\d+$/.test(w)) seen.add(w);
  const index = new MiniSearch({ idField: "w", fields: ["w"], tokenize: (s) => [s] });
  index.addAll([...seen].map((w) => ({ w })));
  words = { set: seen, index };
  wordsFrom = indexes;
  return words;
}

// A query with each word the files do not know put right ("puge berserkrs" -> "pudge berserkers");
// a word known as it is, or a part of a known word, stays. Gives { query, changed }
export function correctQuery(indexes, query) {
  if (!DATASETS.every((d) => indexes[d.id])) return { query, changed: false };
  const { set, index } = wordsOf(indexes);
  let changed = false;
  const fixed = split(query).map((w) => {
    if (w.length < 4 || set.has(w) || /^\d+$/.test(w)) return w;
    const best = index.search(w, { fuzzy: 0.34, prefix: false })[0];
    if (!best || best.id === w) return w;
    changed = true;
    return best.id;
  });
  return { query: fixed.join(" "), changed };
}

// The same forgiving search over any list a page filters (heroes, sets, packs, a kind's items, models):
// the items that match a query as a Set, or null for no query. The list's index is made at its first
// question and kept while the list is the same
const lists = new WeakMap();
export function fuzzyMatch(list, text, query) {
  if (!query.trim()) return null;
  let index = lists.get(list);
  if (!index) {
    index = new MiniSearch({ idField: "i", fields: ["t"], tokenize: split, searchOptions: { prefix: true, fuzzy: 0.25, combineWith: "AND" } });
    index.addAll(list.map((item, i) => ({ i, t: text(item) })));
    lists.set(list, index);
  }
  let found = index.search(query);
  if (!found.length) found = index.search(query, { combineWith: "OR" });
  return new Set(found.map((r) => list[r.id]));
}
