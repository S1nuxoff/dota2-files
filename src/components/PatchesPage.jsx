import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import { imageUrl } from "../lib/catalog.js";
import { formatCount } from "../lib/format.js";
import { changesIn, loadPatches, patchSlug } from "../lib/patches.js";
import { link, navigate } from "../lib/route.js";
import { Dropdown, Empty, Page, PageHead, SearchField, Spinner } from "./ui.jsx";

// A picture of the game by its path, gone when the game has none
function Icon({ path, className }) {
  const [gone, setGone] = useState(false);
  if (gone) return <span className={`${className} bg-ink-800`} />;
  return <img src={imageUrl(path)} alt="" loading="lazy" decoding="async" onError={() => setGone(true)} className={`${className} object-cover`} />;
}

const itemIcon = (id) => `panorama/images/items/${id.replace(/^item_/, "")}_png.png`;
const abilityIcon = (id) => `panorama/images/spellicons/${id}_png.png`;
const heroIcon = (id) => `panorama/images/heroes/icons/${id}_png.png`;
const major = (name) => name.replace(/[a-z]+$/, "");

// The game's patch notes: one patch at a time (the newest, or /patches/<version>), its general
// changes, items, neutral items, heroes and creeps, with a field that keeps only what names a hero,
// an item or an ability
export default function PatchesPage({ version, catalog }) {
  const [patches, setPatches] = useState(null);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("");
  useEffect(() => {
    loadPatches().then(setPatches, (e) => setError(String(e.message || e)));
  }, []);

  const heroes = useMemo(() => new Map((catalog?.heroes || []).map((h) => [h.id, h])), [catalog]);

  if (error) return <Page><Empty title="The patch notes could not be loaded" text={error} /></Page>;
  if (!patches) return (
    <Page className="min-h-[100svh]">
      <PageHead title="Patch notes" sub="Every gameplay patch of Dota 2, from the game's own notes." />
      <Spinner text="Reading the patch notes" />
    </Page>
  );

  const at = Math.max(0, version ? patches.findIndex((p) => patchSlug(p) === version) : 0);
  const patch = patches[at];
  const go = (p) => navigate({ ds: "patches", dir: patchSlug(p) });
  const siblings = patches.filter((p) => major(p.name) === major(patch.name)).reverse();

  return (
    <Page className="min-h-[100svh]">
      <PageHead
        crumbs={[["/patches", "Patch notes"], ["", patch.name]]}
        title={`Patch ${patch.name}`}
        sub={`${patch.date ? `Released ${patch.date}. ` : ""}${formatCount(changesIn(patch))} changes, from the notes the game itself shows. ${formatCount(patches.length)} patches back to ${patches.at(-1).name}.`}
      >
        <div className="mt-8 flex items-center gap-2">
          <button
            onClick={() => go(patches[at + 1])}
            disabled={at === patches.length - 1}
            aria-label="Older patch"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-ink-900 text-ink-300 transition-colors hover:border-white/[0.16] hover:text-ink-100 disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <Dropdown
            value={patchSlug(patch)}
            onChange={(v) => go(patches.find((p) => patchSlug(p) === v))}
            options={patches.map((p) => [patchSlug(p), `${p.name}   ${p.date}`])}
            label="Patch"
          />
          <button
            onClick={() => go(patches[at - 1])}
            disabled={at === 0}
            aria-label="Newer patch"
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.08] bg-ink-900 text-ink-300 transition-colors hover:border-white/[0.16] hover:text-ink-100 disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        {siblings.length > 1 && (
          <nav aria-label={`Patches of ${major(patch.name)}`} className="mt-4 flex flex-wrap justify-center gap-1">
            {siblings.map((p) => (
              <a
                key={p.key}
                href={link(`/patches/${patchSlug(p)}`)}
                aria-current={p === patch ? "page" : undefined}
                className={`rounded-lg px-2.5 py-1 font-mono text-[0.82rem] transition-colors ${p === patch ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-white/[0.06] hover:text-ink-100"}`}
              >
                {p.name}
              </a>
            ))}
          </nav>
        )}
      </PageHead>

      <div className="page-x">
        <div className="mx-auto mt-6 max-w-[52rem]">
          <SearchField value={filter} onChange={setFilter} placeholder="Find a hero, an item or an ability in this patch" />
          <Notes key={patch.key} patch={patch} heroes={heroes} filter={filter.trim().toLowerCase()} />
        </div>
      </div>
    </Page>
  );
}

// The patch's parts, each under its heading, what does not match the filter left out
function Notes({ patch, heroes, filter }) {
  const has = (...names) => !filter || names.some((n) => n && n.toLowerCase().includes(filter));
  const general = patch.general.filter((g) => has(g.title, ...g.notes.map((n) => n.text)));
  const groups = (list) => list.map((g) => ({ ...g, entries: g.entries.filter((e) => has(e.name, g.title)) })).filter((g) => g.entries.length);
  const items = groups(patch.items);
  const neutral = groups(patch.neutral);
  const creeps = groups(patch.creeps);
  const heroList = patch.heroes
    .map((h) => {
      const hero = heroes.get(h.id);
      const name = hero?.name || h.id.replace(/^npc_dota_hero_/, "").replace(/_/g, " ");
      const parts = has(name) ? h.parts : h.parts.filter((p) => has(p.name));
      return { ...h, hero, name, parts };
    })
    .filter((h) => h.parts.length)
    .sort((a, b) => a.name.localeCompare(b.name));

  const sections = [
    general.length && ["general", "General", general.length],
    items.length && ["items", "Items", items.reduce((n, g) => n + g.entries.length, 0)],
    neutral.length && ["neutral", "Neutral items", neutral.reduce((n, g) => n + g.entries.length, 0)],
    heroList.length && ["heroes", "Heroes", heroList.length],
    creeps.length && ["creeps", "Neutral creeps", creeps.reduce((n, g) => n + g.entries.length, 0)],
  ].filter(Boolean);
  if (!sections.length) return <Empty title="Nothing here matches" text="Try another name, or another patch." />;

  return (
    <>
      <nav aria-label="Parts of the patch" className="mt-6 flex flex-wrap justify-center gap-x-5 gap-y-1 text-[0.9rem]">
        {sections.map(([id, title, n]) => (
          <a key={id} href={`#${id}`} className="text-ink-300 transition-colors hover:text-ink-100">
            {title} <span className="text-ink-500 tabular-nums">{n}</span>
          </a>
        ))}
      </nav>

      {general.length > 0 && (
        <Section id="general" title="General">
          <div className="space-y-6">
            {general.map((g) => (
              <div key={g.id}>
                {g.title && <h3 className="text-[1.02rem] font-medium">{g.title}</h3>}
                <Lines notes={g.notes} />
              </div>
            ))}
          </div>
        </Section>
      )}
      {items.length > 0 && <Entries id="items" title="Items" groups={items} />}
      {neutral.length > 0 && <Entries id="neutral" title="Neutral items" groups={neutral} />}
      {heroList.length > 0 && (
        <Section id="heroes" title="Heroes">
          <div className="space-y-4">
            {heroList.map((h) => (
              <article key={h.id} className="overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
                <header className="flex items-center gap-3 border-b border-white/[0.05] px-5 py-3.5">
                  <Icon path={heroIcon(h.id)} className="h-8 w-8 shrink-0 rounded-lg" />
                  {h.hero ? (
                    <a href={link(`/hero/${h.hero.key}`)} className="text-[1.08rem] font-semibold tracking-[-0.015em] transition-colors hover:text-white">
                      {h.name}
                    </a>
                  ) : (
                    <span className="text-[1.08rem] font-semibold capitalize">{h.name}</span>
                  )}
                  {h.title && <span className="text-[0.86rem] text-ember">{h.title}</span>}
                </header>
                <div className="divide-y divide-white/[0.05]">
                  {h.parts.map((p) => (
                    <div key={p.id} className="flex gap-4 px-5 py-4">
                      {p.kind === "ability" ? (
                        <Icon path={abilityIcon(p.id)} className="h-9 w-9 shrink-0 rounded-md" />
                      ) : (
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-ink-850 text-ink-400">
                          {p.kind === "hero" ? <Icon path={heroIcon(h.id)} className="h-9 w-9 rounded-md opacity-60" /> : <Sparkles size={16} />}
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        {p.name && <div className="text-[0.95rem] font-medium">{p.name}</div>}
                        <Lines notes={p.notes} tight={!p.name} />
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </Section>
      )}
      {creeps.length > 0 && <Entries id="creeps" title="Neutral creeps" groups={creeps} />}
    </>
  );
}

function Section({ id, title, children }) {
  return (
    <section id={id} className="mt-16 scroll-mt-24">
      <h2 className="mb-6 text-center text-[clamp(1.6rem,2.6vw,2.1rem)] font-semibold tracking-[-0.035em]">{title}</h2>
      {children}
    </section>
  );
}

// Items, neutral items, creeps: each with its icon and its lines, under its group's title
function Entries({ id, title, groups }) {
  return (
    <Section id={id} title={title}>
      <div className="space-y-8">
        {groups.map((g, i) => (
          <div key={g.title || i}>
            {g.title && <h3 className="mb-3 text-[0.92rem] font-medium text-ink-400">{g.title}</h3>}
            <div className="divide-y divide-white/[0.05] overflow-hidden rounded-2xl border border-white/[0.07] bg-ink-900">
              {g.entries.map((e) => (
                <div key={e.id} className="flex gap-4 px-5 py-4">
                  <Icon path={e.id.startsWith("item_") ? itemIcon(e.id) : abilityIcon(e.id)} className="h-9 w-12 shrink-0 rounded-md" />
                  <div className="min-w-0 flex-1">
                    <div className="text-[0.95rem] font-medium">{e.name}</div>
                    <Lines notes={e.notes} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Section>
  );
}

// The lines of a change, a nested one set in
function Lines({ notes, tight = false }) {
  return (
    <ul className={`${tight ? "mt-0" : "mt-1.5"} space-y-1 text-[0.92rem] leading-relaxed text-ink-300`}>
      {notes.map((n, i) => (
        <li key={i} className="flex gap-2.5" style={n.indent ? { paddingLeft: `${n.indent * 1.1}rem` } : undefined}>
          <span aria-hidden="true" className="mt-[0.6em] h-1 w-1 shrink-0 rounded-full bg-ink-500" />
          <span className="min-w-0">{n.text}</span>
        </li>
      ))}
    </ul>
  );
}
