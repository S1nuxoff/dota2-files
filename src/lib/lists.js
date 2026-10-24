import { fileUrl } from "../datasets.js";
import { kindOf, extOf } from "./format.js";

// Each dataset's files.json ({ dataset, commit, updated, files: [[path, size], ...] }) and names.json,
// read from their gzipped copies (the Hub serves files as they are), into an index the pages browse:
// a tree of folders and a flat list for search. Loaded once per dataset.
const cache = new Map();

async function fetchJsonGz(url) {
  const res = await fetch(`${url}.gz`);
  if (!res.ok || !res.body) throw new Error(`${res.status} ${url}`);
  return new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).json();
}

export function loadIndex(ds) {
  if (!cache.has(ds.id)) {
    const promise = (async () => {
      const [list, names] = await Promise.all([
        fetchJsonGz(fileUrl(ds, "files.json")),
        ds.names ? fetchJsonGz(fileUrl(ds, "names.json")).catch(() => ({})) : {},
      ]);
      return buildIndex(ds, list, names);
    })();
    promise.catch(() => cache.delete(ds.id));
    cache.set(ds.id, promise);
  }
  return cache.get(ds.id);
}

function newDir(name, path, parent) {
  return { name, path, parent, dirs: new Map(), files: [], count: 0, size: 0 };
}

function buildTree(entries) {
  const root = newDir("", "", null);
  for (const entry of entries) {
    const parts = entry.path.split("/");
    let dir = root;
    for (let i = 0; i < parts.length - 1; i++) {
      dir.count++;
      dir.size += entry.size;
      let next = dir.dirs.get(parts[i]);
      if (!next) {
        next = newDir(parts[i], parts.slice(0, i + 1).join("/"), dir);
        dir.dirs.set(parts[i], next);
      }
      dir = next;
    }
    dir.count++;
    dir.size += entry.size;
    dir.files.push(entry);
  }
  return root;
}

function buildIndex(ds, list, names) {
  const paths = new Set(list.files.map(([path]) => path));
  const entries = list.files.map(([path, size]) => {
    const name = path.slice(path.lastIndexOf("/") + 1);
    const label = names[path];
    // A <file>.gz next to <file> is the site's lighter copy of it (models, data files)
    const copy = path.endsWith(".gz") && paths.has(path.slice(0, -3));
    return {
      ds: ds.id,
      path,
      name,
      size,
      ext: extOf(name),
      kind: kindOf(name),
      title: label?.[0] || "",
      tag: label?.[1] || "",
      copy,
      hasGz: paths.has(`${path}.gz`),
      hay: `${path} ${label?.[0] || ""}`.toLowerCase(),
    };
  });
  const trees = {};
  return {
    ds,
    commit: list.commit,
    updated: list.updated,
    entries,
    count: entries.length,
    size: entries.reduce((sum, e) => sum + e.size, 0),
    // withCopies: also the .gz copies; built on first use
    tree(withCopies) {
      const key = withCopies ? "all" : "plain";
      trees[key] ??= buildTree(withCopies ? entries : entries.filter((e) => !e.copy));
      return trees[key];
    },
  };
}

export function findDir(root, path) {
  if (!path) return root;
  let dir = root;
  for (const part of path.split("/")) {
    dir = dir.dirs.get(part);
    if (!dir) return null;
  }
  return dir;
}

export function filesUnder(dir, out = []) {
  out.push(...dir.files);
  for (const sub of dir.dirs.values()) filesUnder(sub, out);
  return out;
}

// Every word of the query in the path or the name, in any order
export function search(entries, query, { kind, withCopies, limit = 5000 }) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return { results: [], total: 0 };
  const results = [];
  let total = 0;
  for (const e of entries) {
    if (!withCopies && e.copy) continue;
    if (kind && e.kind !== kind) continue;
    if (words.every((w) => e.hay.includes(w))) {
      total++;
      if (results.length < limit) results.push(e);
    }
  }
  return { results, total };
}
