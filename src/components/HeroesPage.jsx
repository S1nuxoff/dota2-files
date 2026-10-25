import { useState } from "react";
import { Search } from "lucide-react";
import { heroCard, heroPortrait } from "../lib/catalog.js";
import { link } from "../lib/route.js";
import { Card, PageHead, SearchField, Spinner } from "./ui.jsx";

export default function HeroesPage({ catalog, error }) {
  const [filter, setFilter] = useState("");
  if (!catalog) return error ? <div className="p-16 text-center text-ink-400">The heroes could not be loaded: {error}</div> : <Spinner text="Loading heroes" />;
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const heroes = catalog.heroes.filter((h) => words.every((w) => h.name.toLowerCase().includes(w)));
  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="anim-page">
        <PageHead title="Every file of Dota 2" sub="Pick a hero to get its 3D model, items, sounds, effects and pictures, or search all of them at once.">
          <SearchField value={filter} onChange={setFilter} icon={Search} placeholder={`Find one of ${catalog.heroes.length} heroes`} />
        </PageHead>
        <div className="mx-auto grid max-w-[100rem] grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] gap-5 px-8 pb-20">
          {heroes.map((hero, i) => (
            <Card
              key={hero.id}
              href={link(`/hero/${hero.id.slice("npc_dota_hero_".length)}`)}
              ratio="aspect-[448/678]"
              className="anim-card"
              style={{ animationDelay: `${Math.min(i, 30) * 18}ms` }}
              title={hero.name}
              meta={`${hero.items.length} items${hero.personas.length ? `, ${hero.personas.length} persona${hero.personas.length > 1 ? "s" : ""}` : ""}`}
              picture={
                <img
                  src={heroCard(hero)}
                  loading="lazy"
                  decoding="async"
                  alt=""
                  // A hero new to the game may come before its set picture: its portrait meanwhile
                  onError={(e) => e.currentTarget.src !== heroPortrait(hero) && ((e.currentTarget.src = heroPortrait(hero)), e.currentTarget.classList.replace("object-top", "object-center"))}
                  className="h-full w-full object-cover object-top transition-transform duration-500 ease-out group-hover:scale-[1.04]"
                />
              }
            />
          ))}
        </div>
        {heroes.length === 0 && <p className="pb-20 text-center text-ink-400">No hero has that name.</p>}
        <p className="mx-auto max-w-[100rem] px-8 pb-10 text-[0.8rem] text-ink-600">
          Dota 2 content and materials are trademarks and copyrights of Valve. Not affiliated with Valve. Non-commercial.
        </p>
      </div>
    </div>
  );
}
