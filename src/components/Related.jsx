import { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { imageUrl, loadSounds, ownersOf, useCatalog } from "../lib/catalog.js";
import { link, openItem } from "../lib/route.js";

// What a file of the datasets is part of: the items that use it (and their heroes), and for a sound
// when the game plays it. Shown in the file and model windows
export default function Related({ ds, path, heroKey = "" }) {
  const { catalog } = useCatalog();
  const [sound, setSound] = useState(null);
  useEffect(() => {
    if (ds !== "sounds") return;
    let live = true;
    loadSounds().then((m) => live && setSound(m.get(path) || null), () => {});
    return () => {
      live = false;
    };
  }, [ds, path]);
  if (!catalog) return null;

  const items = ownersOf(catalog, ds, path)
    .map((id) => catalog.items[id])
    .filter(Boolean)
    .slice(0, 24);
  const heroes = new Map();
  if (heroKey && catalog.heroByKey.get(heroKey)) heroes.set(heroKey, catalog.heroByKey.get(heroKey));
  for (const it of items) for (const id of it.heroes) if (catalog.heroById.get(id)) heroes.set(catalog.heroById.get(id).key, catalog.heroById.get(id));
  if (!items.length && !heroes.size && !sound) return null;

  return (
    <div className="space-y-4 text-[0.88rem]">
      {heroes.size > 0 && (
        <div>
          <div className="text-ink-400">Hero</div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {[...heroes.values()].map((h) => (
              <a key={h.key} href={link(`/hero/${h.key}`)} className="rounded-full bg-ink-800 px-3 py-1 text-[0.82rem] text-ink-100 transition-colors hover:bg-ink-700">
                {h.name}
              </a>
            ))}
          </div>
        </div>
      )}
      {items.length > 0 && (
        <div>
          <div className="text-ink-400">Used by</div>
          <div className="mt-2 space-y-1">
            {items.map((it) => (
              <button key={it.id} onClick={() => openItem(it.id, items.map((x) => x.id))} className="flex w-full items-center gap-3 rounded-lg p-1.5 text-left transition-colors hover:bg-ink-850">
                {it.icon ? <img src={imageUrl(it.icon)} alt="" loading="lazy" className="h-9 w-12 shrink-0 rounded object-cover" /> : <Package size={18} className="mx-3 text-ink-600" />}
                <span className="min-w-0 flex-1 truncate">{it.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      {sound && (
        <div>
          <div className="text-ink-400">When it plays</div>
          {sound.rules.length ? (
            <ul className="mt-1.5 space-y-1 text-ink-300">
              {sound.rules.map((r, i) => (
                <li key={i}>
                  <span className="text-ink-100">{r.concept}</span>
                  {r.conditions.length > 0 && `: ${r.conditions.join(", ")}`}
                </li>
              ))}
            </ul>
          ) : (
            <div className="mt-1 text-ink-300">Sound event {sound.event}</div>
          )}
        </div>
      )}
    </div>
  );
}
