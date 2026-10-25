import { Package } from "lucide-react";
import { imageUrl, prefabTitle } from "../lib/catalog.js";
import { link, openItem } from "../lib/route.js";
import { Card } from "./ui.jsx";

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
          {rarity?.color && <span className="absolute inset-x-0 bottom-0 h-[2px] opacity-80" style={{ background: rarity.color }} />}
        </>
      }
    />
  );
}
