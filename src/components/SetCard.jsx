import { imageUrl } from "../lib/catalog.js";
import { link } from "../lib/route.js";
import { FigureCard } from "./ui.jsx";
import { heroIcon } from "./HeroPicker.jsx";

// A set: the hero standing in it as the game's set pages show it, its name, its hero and how many items
export default function SetCard({ set, delay = 0, showHero = false }) {
  return (
    <FigureCard
      href={link(`/set/${set.key}`)}
      className="anim-card"
      style={{ animationDelay: `${delay}ms` }}
      src={set.icon ? imageUrl(set.icon) : ""}
      alt={set.name}
      title={set.name}
      meta={`${showHero && set.hero ? `${set.hero.name}, ` : ""}${set.items.length} items`}
      mark={showHero && set.hero && <img src={heroIcon(set.hero)} alt={set.hero.name} className="h-6 w-6 shrink-0 rounded-md" />}
    />
  );
}
