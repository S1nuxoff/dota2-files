import { Package } from "lucide-react";
import { imageUrl, prefabTitle } from "../lib/catalog.js";

export default function ItemCard({ item, rarities }) {
  const rarity = rarities[item.rarity || "common"];
  return (
    <a
      href={`#/item/${item.id}`}
      className="group flex flex-col overflow-hidden rounded-lg border border-ink-800 bg-ink-900 transition hover:border-ink-600"
    >
      <div className="relative flex aspect-[4/3] items-center justify-center overflow-hidden bg-ink-850">
        {item.icon ? (
          <img src={imageUrl(item.icon)} loading="lazy" decoding="async" alt="" className="h-full w-full object-contain transition group-hover:scale-[1.03]" />
        ) : (
          <Package size={26} strokeWidth={1.25} className="text-ink-600" />
        )}
        {rarity?.color && <span className="absolute inset-x-0 bottom-0 h-0.5" style={{ background: rarity.color }} />}
      </div>
      <div className="px-2.5 py-2 leading-tight">
        <div className="truncate text-xs">{item.name}</div>
        <div className="mt-0.5 truncate text-[11px] text-ink-400">{item.type || item.slot || prefabTitle(item.prefab)}</div>
      </div>
    </a>
  );
}
