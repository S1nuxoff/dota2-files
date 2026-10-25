import { useEffect, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { imageUrl, loadSounds } from "../lib/catalog.js";
import { navigate } from "../lib/route.js";
import { Row } from "./FileTable.jsx";
import SoundList from "./SoundList.jsx";

const STATS = [
  ["strength", "Strength"],
  ["agility", "Agility"],
  ["intelligence", "Intelligence"],
  ["damage", "Damage"],
  ["attackRange", "Attack range"],
  ["attackRate", "Base attack time"],
  ["moveSpeed", "Movement speed"],
];

// The few words on a hero over its stage: its attribute, attack and roles
export function HeroTags({ about }) {
  if (!about) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-1.5">
      {[about.attribute, about.attack, ...about.roles.map(([r]) => r)].filter(Boolean).map((t) => (
        <span key={t} className="rounded-full bg-black/35 px-3 py-1 text-[0.82rem] text-ink-200 backdrop-blur">
          {t}
        </span>
      ))}
    </div>
  );
}

const letters = (s) => s.toLowerCase().replace(/[^a-z]/g, "");

// An ability's sounds and effects among the hero's files: a sound whose event names it
// (Hero_Axe.Berserkers_Call) or a line the game speaks when it is cast (Ability: Berserker's Call),
// an effect whose file names it (axe_berserkers_call_cast.vpcf)
function useAbilityFiles(about, hero, sounds, particles) {
  const [info, setInfo] = useState(null);
  useEffect(() => {
    loadSounds().then(setInfo, () => setInfo(new Map()));
  }, []);
  return useMemo(() => {
    const out = new Map();
    if (!about) return out;
    for (const a of about.abilities) {
      const token = hero.tokens.find((t) => a.id.startsWith(`${t}_`));
      const key = letters(token ? a.id.slice(token.length + 1) : a.id);
      if (key.length < 4) continue;
      const own = sounds.filter((e) => {
        const rec = info?.get(e.path);
        return rec && (letters(rec.event).includes(key) || rec.rules.some((r) => r.conditions.includes(`Ability: ${a.name}`)));
      });
      const fx = particles.filter((e) => letters(e.name.replace(/\.\w+$/, "")).includes(key));
      out.set(a.id, { sounds: own, effects: fx });
    }
    return out;
  }, [about, hero, sounds, particles, info]);
}

// What the game tells of a hero: its summary, its story, its numbers at level 1, its abilities with
// their sounds and effects
export default function HeroAbout({ about, hero, sounds = [], particles = [], route }) {
  const byAbility = useAbilityFiles(about, hero, sounds, particles);
  if (!about) return <p className="py-10 text-center text-ink-400">Nothing written about this hero.</p>;
  return (
    <div className="space-y-12">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="max-w-[46rem] space-y-5">
          {about.hype && <p className="text-[1.15rem] leading-relaxed text-ink-100">{about.hype}</p>}
          {about.bio && <p className="leading-relaxed whitespace-pre-line text-ink-300">{about.bio}</p>}
        </div>
        <div className="h-fit rounded-2xl border border-white/[0.06] bg-ink-900 p-5">
          <dl className="space-y-2.5 text-[0.9rem]">
            {STATS.filter(([k]) => about.stats[k]).map(([k, label]) => {
              const v = about.stats[k];
              return (
                <div key={k} className="flex justify-between gap-4">
                  <dt className="text-ink-400">{label}</dt>
                  <dd className="tabular-nums">{Array.isArray(v) ? `${v[0]} + ${v[1]} per level` : v}</dd>
                </div>
              );
            })}
            {about.complexity > 0 && (
              <div className="flex justify-between gap-4">
                <dt className="text-ink-400">Complexity</dt>
                <dd>{["", "Simple", "Moderate", "Complex"][about.complexity] || about.complexity}</dd>
              </div>
            )}
          </dl>
          {about.roles.length > 0 && (
            <div className="mt-5 space-y-2 border-t border-white/[0.06] pt-4">
              {about.roles.map(([role, level]) => (
                <div key={role} className="flex items-center gap-3 text-[0.88rem]">
                  <span className="w-24 text-ink-300">{role}</span>
                  <span className="flex flex-1 gap-1">
                    {[1, 2, 3].map((n) => (
                      <span key={n} className={`h-1.5 flex-1 rounded-full ${n <= level ? "bg-ink-100" : "bg-ink-700"}`} />
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {about.abilities.length > 0 && (
        <section>
          <h2 className="text-[1.35rem] font-semibold tracking-[-0.02em]">Abilities</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {about.abilities.map((a) => (
              <div key={a.id} className="flex gap-4 rounded-2xl border border-white/[0.06] bg-ink-900 p-5">
                {a.icon ? <img src={imageUrl(a.icon)} alt="" loading="lazy" className="h-16 w-16 shrink-0 rounded-xl" /> : <div className="h-16 w-16 shrink-0 rounded-xl bg-ink-800" />}
                <div className="min-w-0">
                  <h3 className="font-medium">{a.name}</h3>
                  {a.text && <p className="mt-1.5 text-[0.9rem] leading-relaxed whitespace-pre-line text-ink-300">{a.text}</p>}
                  {a.lore && <p className="mt-3 text-[0.84rem] leading-relaxed text-ink-400 italic">{a.lore}</p>}
                  <AbilityFiles files={byAbility.get(a.id)} route={route} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function AbilityFiles({ files, route }) {
  if (!files || (!files.sounds.length && !files.effects.length)) return null;
  const head = "flex cursor-pointer list-none items-center gap-2 text-[0.86rem] text-ink-300 select-none hover:text-ink-100";
  return (
    <div className="mt-4 space-y-2">
      {files.sounds.length > 0 && (
        <details className="group">
          <summary className={head}>
            <ChevronRight size={15} className="transition-transform group-open:rotate-90" /> Sounds <span className="text-ink-400">{files.sounds.length}</span>
          </summary>
          <div className="mt-3">
            <SoundList files={files.sounds} route={route} />
          </div>
        </details>
      )}
      {files.effects.length > 0 && (
        <details className="group">
          <summary className={head}>
            <ChevronRight size={15} className="transition-transform group-open:rotate-90" /> Effects <span className="text-ink-400">{files.effects.length}</span>
          </summary>
          <div className="mt-2">
            {files.effects.map((e) => (
              <Row key={e.path} e={e} active={route.file === `${e.ds}:${e.path}`} onOpen={() => navigate({ ...route, file: `${e.ds}:${e.path}` })} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
