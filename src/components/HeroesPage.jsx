import { useMemo, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { ATTRIBUTES, attributeIcon, heroCard, heroPortrait } from "../lib/catalog.js";
import { link } from "../lib/route.js";
import { FigureCard, Dropdown, Empty, GRID, Page, PageHead, SearchField, Segmented, Spinner, Toolbar, Button, LoadingList, Progressive } from "./ui.jsx";

const ROLES = ["Carry", "Support", "Nuker", "Disabler", "Initiator", "Durable", "Escape", "Pusher"];

// Every hero, as the game's hero grid knows them: by attribute, attack and role, searched by name
export default function HeroesPage({ catalog, error }) {
  const [filter, setFilter] = useState("");
  const [attribute, setAttribute] = useState("");
  const [attack, setAttack] = useState("");
  const [role, setRole] = useState("");
  const [sort, setSort] = useState("name");

  const heroes = useMemo(() => {
    if (!catalog) return [];
    const match = fuzzyMatch(catalog.heroes, (h) => `${h.name} ${h.key} ${h.tokens.join(" ")}`, filter);
    const list = catalog.heroes.filter(
      (h) =>
        (!match || match.has(h)) &&
        (!attribute || h.about?.attribute === attribute) &&
        (!attack || h.about?.attack === attack) &&
        (!role || h.about?.roles.some(([r]) => r === role))
    );
    const byName = (a, b) => a.name.localeCompare(b.name);
    return list.sort(sort === "items" ? (a, b) => b.items.length - a.items.length || byName(a, b) : sort === "sets" ? (a, b) => b.sets.length - a.sets.length || byName(a, b) : byName);
  }, [catalog, filter, attribute, attack, role, sort]);

  if (!catalog) return error ? <Empty title="The heroes could not be loaded" text={error} /> : <LoadingList title="Heroes" ratio="aspect-[1/1.02]" grid={GRID.tall} count={24} />;
  const count = (a) => catalog.heroes.filter((h) => h.about?.attribute === a).length;
  const clear = () => (setFilter(""), setAttribute(""), setAttack(""), setRole(""));

  return (
    <Page>
      <PageHead
        title="Heroes"
        sub="Each with its 3D model and personas, every item by set, its abilities, voice lines, effects and pictures."
        search={<SearchField big value={filter} onChange={setFilter} placeholder={`Find one of ${catalog.heroes.length} heroes`} />}
      />
      <Toolbar>
        <Segmented
          label="Attribute"
          value={attribute}
          onChange={setAttribute}
          items={[["", "All"], ...ATTRIBUTES.filter(count).map((a) => [a, <AttributeLabel key={a} attribute={a} />, count(a)])]}
        />
        <div className="flex flex-wrap items-center gap-2 max-sm:w-full">
          <Dropdown value={attack} onChange={setAttack} label="Attack" options={[["", "Any attack"], ["Melee", "Melee"], ["Ranged", "Ranged"]]} className="max-sm:flex-1" />
          <Dropdown value={role} onChange={setRole} label="Role" options={[["", "Any role"], ...ROLES.map((r) => [r, r])]} className="max-sm:flex-1" />
          <Dropdown value={sort} onChange={setSort} label="Sort" options={[["name", "By name"], ["items", "Most items"], ["sets", "Most sets"]]} className="max-sm:flex-1" />
        </div>
      </Toolbar>
      <div className="page-x pt-4">
        {heroes.length === 0 ? (
          <Empty title="No hero fits" text="Clear the search or a filter to see more." action={<Button onClick={clear}>Clear all</Button>} />
        ) : (
          <Progressive
            items={heroes}
            step={36}
            className={GRID.tall}
            render={(hero, i) => (
              <FigureCard
                key={hero.id}
                href={link(`/hero/${hero.key}`)}
                className="anim-card"
                style={{ animationDelay: `${Math.min(i % 36, 24) * 16}ms` }}
                src={heroCard(hero)}
                fallback={heroPortrait(hero)}
                alt={hero.name}
                title={hero.name}
                meta={`${hero.items.length} items, ${hero.sets.length} sets`}
                mark={hero.about?.attribute && <img src={attributeIcon(hero.about.attribute)} alt={hero.about.attribute} title={hero.about.attribute} className="h-6 w-6 shrink-0" />}
              />
            )}
          />
        )}
      </div>
    </Page>
  );
}

function AttributeLabel({ attribute }) {
  return (
    <span className="flex items-center gap-1.5">
      <img src={attributeIcon(attribute)} alt="" className="h-4 w-4" />
      <span className="max-lg:hidden">{attribute}</span>
    </span>
  );
}
