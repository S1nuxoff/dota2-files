import { useMemo, useState } from "react";
import { formatCount } from "../lib/format.js";
import { navigate } from "../lib/route.js";
import { Cell, Row, withSizes } from "./FileTable.jsx";

const SHOWN = 48;
const pretty = (s) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Some of a hero's files in sections by what they belong to: the hero itself (its own files and its
// default items'), each of its abilities, each set, the other cosmetics. An item's files are those
// under its refs (the longest prefix wins); an ability's are named after it (luna_lucent_beam*)
export function groupHeroFiles(files, hero, catalog) {
  const owners = new Map();
  for (const id of hero.items) {
    const item = catalog.items[id];
    if (!item) continue;
    for (const [ds, prefixes] of Object.entries(item.refs || {})) for (const p of prefixes) owners.set(`${ds}:${p}`, item);
  }
  const prefixes = [...owners.keys()].sort((a, b) => b.length - a.length);
  const abilities = [...hero.abilities].sort((a, b) => b.length - a.length);
  const by = new Map();
  const add = (k, e) => (by.has(k) ? by.get(k) : by.set(k, []).get(k)).push(e);
  const sets = new Set();
  const abilityTitles = new Set();
  for (const e of files) {
    const key = `${e.ds}:${e.path}`;
    const item = owners.get(prefixes.find((p) => key.startsWith(p)));
    if (item) {
      const set = item.prefab !== "default_item" && item.set && catalog.setByKey.get(item.set);
      if (item.prefab === "default_item") add("Hero", e);
      else if (set) {
        sets.add(set.name);
        add(set.name, e);
      }
      else add("Other cosmetics", e);
      continue;
    }
    const file = e.path.slice(e.path.lastIndexOf("/") + 1);
    const ability = abilities.find((a) => file.startsWith(a) && /[_.]/.test(file[a.length] || "."));
    if (ability) {
      const token = hero.tokens.find((t) => ability.startsWith(`${t}_`));
      const title = `Ability: ${pretty(token ? ability.slice(token.length + 1) : ability)}`;
      abilityTitles.add(title);
      add(title, e);
    } else add("Hero", e);
  }
  const byName = (a, b) => a.localeCompare(b, "en");
  const order = ["Hero", ...[...abilityTitles].sort(byName), ...[...sets].sort(byName), "Other cosmetics"];
  return order.filter((k) => by.get(k)?.length).map((k) => [k, by.get(k)]);
}

// The sections, pictures as a grid of cells, other files as rows; a long section shows its first
// files and the rest on a click
export default function GroupedFiles({ files, hero, catalog, grid, route }) {
  const sections = useMemo(() => groupHeroFiles(grid ? withSizes(files) : files, hero, catalog), [files, hero, catalog, grid]);
  return (
    <div className="space-y-10">
      {sections.map(([title, list]) => (
        <Section key={title} title={title} list={list} grid={grid} route={route} />
      ))}
      {sections.length === 0 && <p className="py-10 text-center text-ink-400">No files.</p>}
    </div>
  );
}

function Section({ title, list, grid, route }) {
  const [all, setAll] = useState(false);
  const keyOf = (e) => `${e.ds}:${e.path}`;
  const open = (e) => navigate({ ...route, file: keyOf(e) });
  const shown = all ? list : list.slice(0, SHOWN);
  return (
    <section>
      <h3 className="text-[1.3rem] font-semibold tracking-[-0.03em]">
        {title} <span className="ml-1 font-normal text-ink-400">{formatCount(list.length)}</span>
      </h3>
      {grid ? (
        <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
          {shown.map((e) => (
            <Cell key={keyOf(e)} e={e} active={route.file === keyOf(e)} onOpen={() => open(e)} />
          ))}
        </div>
      ) : (
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
          {shown.map((e) => (
            <Row key={keyOf(e)} e={e} active={route.file === keyOf(e)} onOpen={() => open(e)} />
          ))}
        </div>
      )}
      {list.length > shown.length && (
        <button onClick={() => setAll(true)} className="mt-3 rounded-lg px-3 py-1.5 text-[0.88rem] text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100">
          Show all {formatCount(list.length)}
        </button>
      )}
    </section>
  );
}
