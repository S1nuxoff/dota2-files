import { Package } from "lucide-react";
import { imageUrl, prefabTitle } from "../lib/catalog.js";
import { link } from "../lib/route.js";
import { Card } from "./ui.jsx";

// An item: its icon, its name, and its rarity as a thin line in the rarity's colour
export default function ItemCard({ item, rarities, delay = 0 }) {
  const rarity = rarities[item.rarity || "common"];
  return (
    <Card
      href={link(`/item/${item.id}`)}
      className="anim-card"
      style={{ animationDelay: `${delay}ms` }}
      title={item.name}
      meta={item.type || item.slot || prefabTitle(item.prefab)}
      picture={
        <>
          {item.icon ? (
            <img src={imageUrl(item.icon)} loading="lazy" decoding="async" alt="" className="h-full w-full object-contain transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
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
