import { Progressive } from "./ui.jsx";
import { Package } from "lucide-react";
import { imageUrl } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import { openItem } from "../lib/route.js";
import ItemCard from "./ItemCard.jsx";

// The chance a treasure shows its extras with (treasure_rarity_override), in words
const BONUS = { rare: "Rare bonus", very_rare: "Very rare bonus", ultra_rare: "Ultra rare bonus", cosmically_rare: "Cosmically rare bonus" };
const bonusTitle = (r) => BONUS[r] || (r ? `${r.replace(/_/g, " ")} bonus` : "Bonus");

// A bundle's items; a treasure's contents and the extras it may give, grouped by how rare; and for any item, the
// treasures it drops from. compact: small icons for the item window, else cards for a page
export default function Loot({ item, catalog, compact = false }) {
  const loot = item.loot;
  const from = (catalog.foundIn.get(item.id) || []).filter((id) => catalog.items[id]);
  const bundle = (item.bundle || []).filter((id) => catalog.items[id]);
  const bundles = (catalog.inBundles.get(item.id) || []).filter((id) => catalog.items[id]);
  if (!loot && !from.length && !bundle.length && !bundles.length) return null;

  const bonus = new Map();
  for (const [id, r] of loot?.bonus || []) if (catalog.items[id]) (bonus.get(r) || bonus.set(r, []).get(r)).push(id);
  const order = ["rare", "very_rare", "ultra_rare", "cosmically_rare"];
  const groups = [
    ...(bundle.length ? [["In this bundle", bundle, "Its items, each with its own files"]] : []),
    ...(loot?.drops.length ? [["Contents", loot.drops.filter((id) => catalog.items[id]), "One of these"]] : []),
    ...[...bonus.entries()].sort((a, b) => order.indexOf(a[0]) - order.indexOf(b[0])).map(([r, ids]) => [bonusTitle(r), ids, "A chance on top of the contents"]),
    ...(bundles.length ? [["Comes in", bundles, "The bundles that hold it"]] : []),
    ...(from.length ? [["Drops from", from.sort((a, b) => (catalog.items[b].date || "").localeCompare(catalog.items[a].date || "")), "The treasures that can give it"]] : []),
  ];

  return groups.map(([title, ids, sub]) =>
    compact ? (
      <section key={title}>
        <h3 className="font-medium">
          {title} <span className="ml-1 text-[0.8rem] font-normal text-ink-400">{formatCount(ids.length)}</span>
        </h3>
        <div className="mt-3 grid grid-cols-4 gap-2">
          {ids.map((id) => (
            <button
              key={id}
              onClick={() => openItem(id, ids)}
              title={catalog.items[id].name}
              className="aspect-square overflow-hidden rounded-xl border border-white/[0.06] transition-colors hover:border-white/25"
            >
              {catalog.items[id].icon ? <img src={imageUrl(catalog.items[id].icon)} alt="" loading="lazy" className="h-full w-full object-cover" /> : <Package size={20} className="m-auto text-ink-600" />}
            </button>
          ))}
        </div>
      </section>
    ) : (
      <section key={title} className="mt-14">
        <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">
          {title} <span className="ml-1 text-[1rem] font-normal text-ink-400">{formatCount(ids.length)}</span>
        </h2>
        <p className="mt-1 text-[0.9rem] text-ink-400">{sub}</p>
        <Progressive
          items={ids}
          step={36}
          className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(16rem,20rem))] sm:justify-center sm:gap-4"
          render={(id, i) => <ItemCard key={id} item={catalog.items[id]} rarities={catalog.rarities} delay={Math.min(i % 36, 24) * 20} list={ids} />}
        />
      </section>
    )
  );
}
