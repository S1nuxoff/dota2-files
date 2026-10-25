import { AudioLines, Box, Image, Package, Sparkles } from "lucide-react";
import { imageUrl, prefabTitle } from "../lib/catalog.js";
import { link, openItem } from "../lib/route.js";
import { Card } from "./ui.jsx";

// What an item holds, as small marks on its card: a 3D model (its own or its bundle's), sounds,
// effects; a picture only when there is nothing else
function marks(item) {
  const has = (ds) => !!item.refs[ds]?.length;
  const out = [];
  if (has("models") || item.bundle) out.push([Box, "3D model"]);
  if (has("particles")) out.push([Sparkles, "Effects"]);
  if (has("sounds")) out.push([AudioLines, "Sounds"]);
  if (!out.length) out.push([Image, "Picture only"]);
  return out;
}

// An item: its icon, its name, and its rarity as a thin line in the rarity's colour. A click opens it
// over the page (list: the items to step through from there); a click with a modifier, its own page
export default function ItemCard({ item, rarities, delay = 0, list }) {
  const rarity = rarities[item.rarity || "common"];
  return (
    <Card
      href={link(`/item/${item.id}`)}
      onClick={(e) => {
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
        e.preventDefault();
        openItem(item.id, list);
      }}
      className="anim-card"
      style={{ animationDelay: `${delay}ms` }}
      title={item.name}
      meta={item.type || item.slot || prefabTitle(item.prefab)}
      picture={
        <>
          {item.icon ? (
            <img src={imageUrl(item.icon)} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
          ) : (
            <div className="flex h-full items-center justify-center">
              <Package size={28} strokeWidth={1.25} className="text-ink-600" />
            </div>
          )}
          <span className="absolute top-2 left-2 flex gap-1">
            {marks(item).map(([Icon, label]) => (
              <span key={label} title={label} className="flex h-6 w-6 items-center justify-center rounded-md bg-black/55 text-ink-100 backdrop-blur">
                <Icon size={13} />
              </span>
            ))}
          </span>
          {rarity?.color && <span className="absolute inset-x-0 bottom-0 h-[2px] opacity-80" style={{ background: rarity.color }} />}
        </>
      }
    />
  );
}
