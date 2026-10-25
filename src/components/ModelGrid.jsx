import { useEffect, useMemo, useState } from "react";
import { Box, Download } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { loadModels } from "../lib/catalog.js";
import { formatSize } from "../lib/format.js";
import FileTable from "./FileTable.jsx";
import ModelPanel from "./ModelPanel.jsx";
import { Card } from "./ui.jsx";

const pretty = (file) => file.replace(/\.glb$/, "").replace(/_/g, " ");
const previewUrl = (path) => fileUrl(datasetById("models"), `previews/${path.slice(0, -4)}.webp`);

// Some files of dota2-models (a hero's): its models as cards, each opening in the model window (3D,
// measures, textures); the rest (skeletons, cloth, skins as JSON, cube maps) in a list under them
export default function ModelGrid({ files, catalog, indexes, heroName = "", route }) {
  const [rows, setRows] = useState(null);
  const [open, setOpen] = useState(-1);
  useEffect(() => {
    loadModels().then(
      (list) => setRows(new Map(list.map((m) => [`${m.ds}:${m.path}`, m]))),
      () => setRows(new Map())
    );
  }, []);

  const glbs = useMemo(() => files.filter((e) => e.ext === "glb" && !e.path.startsWith("previews/")), [files]);
  const others = useMemo(() => files.filter((e) => !(e.ext === "glb" && !e.path.startsWith("previews/"))), [files]);
  const cards = useMemo(
    () =>
      glbs.map((e) => {
        const m = rows?.get(`${e.ds}:${e.path}`) || { ds: e.ds, path: e.path, type: "", group: "", theme: "", dims: null, triangles: null, animations: null, textures: [] };
        return { key: e.path, models: [m], first: m, name: e.title || pretty(e.name), heroName, entry: e };
      }),
    [glbs, rows, heroName]
  );
  // The cards in sections: the hero's own (body and default items), each set, the other cosmetics,
  // the rest (effects, props); a card keeps its index in cards for the window's prev/next
  const sections = useMemo(() => {
    const by = new Map([["Hero", []]]);
    const add = (k, i) => (by.has(k) ? by.get(k) : by.set(k, []).get(k)).push(i);
    const sets = [];
    cards.forEach((c, i) => {
      const item = catalog?.items[c.first.item];
      if (c.first.type === "heroes" || item?.prefab === "default_item") add("Hero", i);
      else if (item?.set && catalog.setByKey.get(item.set)) {
        const name = catalog.setByKey.get(item.set).name;
        if (!by.has(name)) sets.push(name);
        add(name, i);
      } else if (item) add("Other cosmetics", i);
      else add("Other models", i);
    });
    const order = ["Hero", ...sets.sort((a, b) => a.localeCompare(b, "en")), "Other cosmetics", "Other models"];
    return order.filter((k) => by.get(k)?.length).map((k) => [k, by.get(k)]);
  }, [cards, catalog]);

  // The files the window looks up: the models' and the textures' datasets
  const entries = useMemo(() => {
    const out = new Map();
    for (const ds of ["models", "maps", "textures"]) for (const e of indexes[ds]?.entries || []) out.set(`${ds}:${e.path}`, e);
    return out;
  }, [indexes]);

  return (
    <>
      <div className="space-y-10">
        {sections.map(([title, list]) => (
          <section key={title}>
            <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">
              {title} <span className="ml-1 font-normal text-ink-400">{list.length}</span>
            </h3>
            <div className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(12.5rem,1fr))] gap-4">
              {list.map((i, n) => (
                <div key={cards[i].key} className="anim-card" style={{ animationDelay: `${Math.min(n, 24) * 20}ms` }}>
                  <ModelTile card={cards[i]} onOpen={() => setOpen(i)} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
      {cards.length === 0 && <p className="py-10 text-center text-ink-400">No models.</p>}

      {others.length > 0 && (
        <section className="mt-12">
          <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">
            Other model files <span className="ml-1 font-normal text-ink-400">{others.length}</span>
          </h3>
          <p className="mt-1 text-[0.88rem] text-ink-400">Skeletons, cloth, skins and sequences as JSON, and the cube maps the materials reflect</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
            <FileTable entries={others} route={route} height={`${Math.min(30, others.length * 2.75 + 0.5)}rem`} />
          </div>
        </section>
      )}

      {open >= 0 && cards[open] && (
        <ModelPanel
          key={cards[open].key}
          card={cards[open]}
          entries={entries}
          onClose={() => setOpen(-1)}
          onPrev={() => setOpen((open - 1 + cards.length) % cards.length)}
          onNext={() => setOpen((open + 1) % cards.length)}
        />
      )}
    </>
  );
}

function ModelTile({ card, onOpen }) {
  const [broken, setBroken] = useState(false);
  const e = card.entry;
  return (
    <Card
      onClick={onOpen}
      title={<span className="capitalize">{card.name}</span>}
      meta={`${e.name} · ${formatSize(e.size)}`}
      action={
        <a
          href={fileUrl(datasetById(e.ds), e.path, true)}
          onClick={(ev) => ev.stopPropagation()}
          title="Download the glb"
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-black/55 text-ink-100 backdrop-blur hover:bg-black/75"
        >
          <Download size={16} />
        </a>
      }
      picture={
        !broken ? (
          <img
            src={previewUrl(e.path)}
            loading="lazy"
            decoding="async"
            alt=""
            onError={() => setBroken(true)}
            className="h-full w-full object-contain p-5 transition-transform duration-500 ease-out group-hover:scale-[1.05]"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Box size={32} strokeWidth={1} className="text-ink-600" />
          </div>
        )
      }
    />
  );
}
