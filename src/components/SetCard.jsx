import { imageUrl } from "../lib/catalog.js";
import { link } from "../lib/route.js";
import { Card } from "./ui.jsx";

// A set: the hero standing in it as the game's set pages show it, its name, how many items
export default function SetCard({ set, delay = 0, showHero = false }) {
  return (
    <Card
      href={link(`/set/${set.key}`)}
      ratio="aspect-[448/678]"
      className="anim-card"
      style={{ animationDelay: `${delay}ms` }}
      title={set.name}
      meta={`${showHero && set.hero ? `${set.hero.name}, ` : ""}${set.items.length} items`}
      picture={
        set.icon ? (
          <img src={imageUrl(set.icon)} loading="lazy" decoding="async" alt="" className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]" />
        ) : null
      }
    />
  );
}
