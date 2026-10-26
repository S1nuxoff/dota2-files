import { datasetById, fileUrl } from "../datasets.js";

// The game's own patch notes (dota2-data: patchnotes/patchnotes.vdpn.json, the manifest the client's
// patch notes page reads, and resource/localization/patchnotes/patchnotes_english.txt.json, its
// texts), with the names of abilities and items from the English texts of the game. Every patch
// since 7.06d: { key, name, date, general, items, neutral, creeps, heroes }, newest first.
// About 6 MB, loaded once when the patch notes are opened.
let promise = null;

async function gz(url) {
  const res = await fetch(`${url}.gz`);
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  return new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
}

async function json(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

export function loadPatches() {
  promise ??= (async () => {
    const ds = datasetById("data");
    const [manifest, texts, names] = await Promise.all([
      json(fileUrl(ds, "patchnotes/patchnotes.vdpn.json")),
      json(fileUrl(ds, "resource/localization/patchnotes/patchnotes_english.txt.json")),
      gz(fileUrl(ds, "dotadex/data/i18n/english.json")),
    ]);
    return parse(manifest.patch_manifest, texts.patch || texts, names);
  })();
  promise.catch(() => (promise = null));
  return promise;
}

// The patch's address: 7.41f
export const patchSlug = (patch) => patch.name;

const pretty = (id) => id.replace(/^item_/, "").replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// A text of the notes as plain lines: <br> breaks it, other markup (spans, a table now and then) goes
function lines(text) {
  return text
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
}

function parse(manifest, texts, names) {
  const text = (token) => (token && token.startsWith("#") ? texts[token.slice(1)] ?? "" : token || "");
  // An entry's notes: note, note#2, ... each { note, indent }; the lines of each, kept in order
  const notesOf = (entry) => {
    const out = [];
    for (const [key, value] of Object.entries(entry || {})) {
      if (!/^note(#\d+)?$/.test(key) || !value?.note) continue;
      const indent = Math.max(0, Number(value.indent) || 0);
      for (const line of lines(text(value.note))) out.push({ text: line, indent });
    }
    return out;
  };
  // the game writes the keys as DOTA_Tooltip_ability_x, DOTA_Tooltip_Ability_x or ..._x:n
  const tooltips = new Map();
  for (const [k, v] of Object.entries(names)) {
    const key = k.toLowerCase().replace(/:.*$/, "");
    if (key.startsWith("dota_tooltip_ability_") && !tooltips.has(key)) tooltips.set(key, v);
  }
  const nameOf = (id) => tooltips.get(`dota_tooltip_ability_${id.toLowerCase()}`) || pretty(id);
  // Items, neutral items and creeps: entries in order, a title entry starts a group of its own
  const groups = (section) => {
    const out = [];
    let group = null;
    for (const [id, entry] of Object.entries(section || {})) {
      if (entry?.title && (entry.is_general || id.startsWith("#"))) {
        group = { title: lines(text(entry.title)).join(" "), entries: [] };
        out.push(group);
        continue;
      }
      const notes = notesOf(entry);
      if (!notes.length) continue;
      if (!group) out.push((group = { title: "", entries: [] }));
      group.entries.push({ id, name: nameOf(id), notes });
    }
    return out.filter((g) => g.entries.length);
  };

  const patches = Object.entries(manifest).map(([key, p]) => {
    const general = Object.entries(p.generic || {})
      .map(([id, entry]) => ({ id, title: entry.title ? lines(text(entry.title)).join(" ") : "", notes: notesOf(entry) }))
      .filter((g) => g.notes.length);
    const heroes = Object.entries(p.heroes || {})
      .map(([id, hero]) => {
        const parts = [];
        for (const [key, entry] of Object.entries(hero)) {
          if (key === "postfix_lines" || key === "title" || typeof entry !== "object") continue;
          const notes = notesOf(entry);
          if (!notes.length) continue;
          const kind = key === "default" ? "hero" : key === "talent" ? "talent" : key.startsWith("hero_facet_") ? "facet" : "ability";
          const name = kind === "hero" ? "" : kind === "talent" ? "Talents" : kind === "facet" ? `Facet ${key.slice("hero_facet_".length)}` : nameOf(key);
          parts.push({ id: key, kind, name, notes });
        }
        return { id, title: hero.title ? lines(text(hero.title)).join(" ") : "", parts };
      })
      .filter((h) => h.parts.length);
    return {
      key,
      name: String(p.patch_name || key).replace(/^patch\s+/i, ""),
      date: p.patch_date || "",
      general,
      items: groups(p.items),
      neutral: groups(p.items_neutral),
      creeps: groups(p.neutral_creeps),
      heroes,
    };
  });
  return patches.filter((p) => p.general.length || p.items.length || p.neutral.length || p.creeps.length || p.heroes.length).reverse();
}

// How many changes a patch has: every line of it
export const changesIn = (patch) =>
  patch.general.reduce((n, g) => n + g.notes.length, 0) +
  [patch.items, patch.neutral, patch.creeps].flat().reduce((n, g) => n + g.entries.reduce((m, e) => m + e.notes.length, 0), 0) +
  patch.heroes.reduce((n, h) => n + h.parts.reduce((m, p) => m + p.notes.length, 0), 0);
