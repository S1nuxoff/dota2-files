import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, Pause, Play } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
import { loadSounds } from "../lib/catalog.js";
import FileTable from "./FileTable.jsx";

// The game's sound folders, named for people (sounds/<folder>/...): the first that fits
const KINDS = [
  [/^sounds\/vo\/announcer/, "Announcers"],
  [/^sounds\/vo\//, "Voice lines"],
  [/^sounds\/weapons\//, "Abilities and attacks"],
  [/footsteps/, "Footsteps"],
  [/^sounds\/music\//, "Music"],
  [/^sounds\/items\//, "Items"],
  [/^sounds\/ui\//, "Interface"],
];
const kindOf = (path) => KINDS.find(([re]) => re.test(path))?.[1] || path.split("/").slice(1, -1).join(" / ") || "Other";

// What a line is about when the game says nothing of it, from its name: auto_axe_ability_berserk_03.mp3
// -> ability berserk (the speaker's name, "auto" and the number off)
const topicOf = (name, speaker) => {
  const parts = name.replace(/\.\w+$/, "").replace(/_\d+[a-z]?$/, "").split("_").filter((p) => p !== "auto" && p !== speaker);
  return (parts[0] === "ability" || parts[0] === "item" ? parts.slice(0, 2) : parts.slice(0, 1)).join(" ") || "other";
};
// A sound event in words, without its owner: Hero_Axe.Attack.Jungle -> Attack jungle
const eventTopic = (event) => {
  const rest = event.includes(".") ? event.slice(event.indexOf(".") + 1) : event;
  const w = rest.replace(/[._]+/g, " ").replace(/([a-z])([A-Z])/g, "$1 $2").trim().toLowerCase();
  return w || "other";
};
const VOICE = "Voice: ";
// A music pack's track by the moment of the game it plays at: battle_01_end.mp3 -> Battle
const MOMENTS = { ui_main: "Main menu", ui_hero_select: "Hero select", ui_startup: "Startup", explore: "Exploration", killed: "Death", smoke: "Smoke of Deceit" };
const musicTopic = (name) => {
  const m = name.replace(/\.\w+$/, "").replace(/(_\d+.*|_end|_layer\w*)$/, "");
  return MOMENTS[m] || m.replace(/_/g, " ");
};

// A hero's sounds: grouped by what they are, each line played in place, one at a time; the files
// that are not sounds (phonemes) under them
export default function SoundList({ files, route }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState("");
  // When each sound plays, from the tracker (null while it loads or when it could not)
  const [info, setInfo] = useState(null);
  useEffect(() => {
    loadSounds().then(setInfo, () => setInfo(new Map()));
  }, []);
  useEffect(() => () => audio.current?.pause(), []);
  const play = (e) => {
    if (!audio.current) audio.current = new Audio();
    const a = audio.current;
    if (playing === e.path && !a.paused) {
      a.pause();
      setPlaying("");
      return;
    }
    a.src = fileUrl(datasetById(e.ds), e.path);
    a.onended = () => setPlaying("");
    a.play().catch(() => setPlaying(""));
    setPlaying(e.path);
  };

  const sounds = useMemo(() => files.filter((e) => e.kind === "audio"), [files]);
  const others = useMemo(() => files.filter((e) => e.kind !== "audio"), [files]);
  // Sounds by kind (their folder); voice lines the talker speaks in topics by when (its concepts),
  // each other voice the hero has (Voice: Jungle Axe) a group of its own; other sounds in topics by
  // their sound event; a line's conditions noted under it (notes: "<topic>|<path>" -> text)
  const { groups, notes } = useMemo(() => {
    const notes = new Map();
    const byGroup = new Map();
    const groupOf = (title) => byGroup.get(title) || byGroup.set(title, { kind: title, list: [], topics: new Map() }).get(title);
    const sorted = [...sounds].sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
    for (const e of sorted) {
      const kind = kindOf(e.path);
      const rec = info?.get(e.path);
      if (rec?.rules.length) {
        const voice = rec.rules.flatMap((r) => r.conditions).find((c) => c.startsWith(VOICE));
        const g = groupOf(voice ? `${kind}: ${voice.slice(VOICE.length)}` : kind);
        g.list.push(e);
        for (const r of rec.rules) {
          const t = r.concept;
          if (!g.topics.has(t)) g.topics.set(t, []);
          const l = g.topics.get(t);
          if (!l.includes(e)) l.push(e);
          const cond = r.conditions.filter((c) => !c.startsWith(VOICE)).join(", ");
          const key = `${t}|${e.path}`;
          if (cond) notes.set(key, notes.has(key) ? `${notes.get(key)}; or ${cond}` : cond);
        }
        continue;
      }
      const g = groupOf(kind);
      g.list.push(e);
      const t = kind === "Music" ? musicTopic(e.name) : rec ? eventTopic(rec.event) : topicOf(e.name, e.path.split("/").at(-2));
      if (!g.topics.has(t)) g.topics.set(t, []);
      g.topics.get(t).push(e);
    }
    const groups = [...byGroup.values()]
      .sort((a, b) => b.list.length - a.list.length)
      .map((g) => {
        // Topics of one or two sounds go together, unless that is all there is
        let topics = [...g.topics.entries()].sort((a, b) => b[1].length - a[1].length);
        const small = topics.filter(([, l]) => l.length < 3);
        if (small.length > 1 && small.length < topics.length) {
          topics = topics.filter(([, l]) => l.length >= 3);
          topics.push(["other", small.flatMap(([, l]) => l)]);
        }
        return { kind: g.kind, list: g.list, topics: topics.length > 1 ? topics : null };
      });
    return { groups, notes };
  }, [sounds, info]);

  const rows = (list, topic = "") => (
    <div className="divide-y divide-white/[0.04]">
      {list.map((e) => (
        <SoundRow key={e.path} e={e} note={notes.get(`${topic}|${e.path}`)} playing={playing === e.path} onPlay={() => play(e)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      {groups.map(({ kind, list, topics }) => (
        <section key={kind}>
          <h3 className="text-center text-[1.3rem] font-semibold tracking-[-0.03em]">
            {kind} <span className="ml-1 font-normal text-ink-400">{formatCount(list.length)}</span>
          </h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] frost">
            {topics
              ? topics.map(([topic, l]) => (
                  <details key={topic} className="group border-b border-white/[0.06] last:border-b-0">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition-colors select-none hover:bg-ink-850">
                      <ChevronRight size={16} className="text-ink-400 transition-transform group-open:rotate-90" />
                      <span className="flex-1 text-[0.92rem] first-letter:uppercase">{topic.replace(/_/g, " ")}</span>
                      <span className="text-[0.82rem] text-ink-400 tabular-nums">{l.length}</span>
                    </summary>
                    <div className="border-t border-white/[0.04]">{rows(l, topic)}</div>
                  </details>
                ))
              : rows(list)}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="py-10 text-center text-ink-400">No sounds.</p>}

      {others.length > 0 && (
        <section>
          <h3 className="text-center text-[1.3rem] font-semibold tracking-[-0.03em]">
            Other sound files <span className="ml-1 font-normal text-ink-400">{others.length}</span>
          </h3>
          <p className="mt-1 text-center text-[0.88rem] text-ink-400">The voice lines' phonemes for lip sync, as JSON</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] frost p-2">
            <FileTable entries={others} route={route} height={`${Math.min(20, others.length * 2.75 + 0.5)}rem`} />
          </div>
        </section>
      )}
    </div>
  );
}

function SoundRow({ e, note, playing, onPlay }) {
  return (
    <div className={`group flex items-center gap-4 px-4 py-2 transition-colors ${playing ? "bg-ink-850" : "hover:bg-ink-850"}`}>
      <button
        onClick={onPlay}
        aria-label={playing ? `Pause ${e.name}` : `Play ${e.name}`}
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${playing ? "bg-ink-100 text-ink-950" : "bg-ink-800 text-ink-100 hover:bg-ink-700"}`}
      >
        {playing ? <Pause size={15} fill="currentColor" /> : <Play size={15} fill="currentColor" className="translate-x-px" />}
      </button>
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate text-[0.9rem]">{e.name.replace(/\.\w+$/, "")}</div>
        <div className="truncate text-[0.76rem] text-ink-400" title={note}>{note || e.path.slice(0, e.path.lastIndexOf("/"))}</div>
      </div>
      <span className="text-[0.8rem] text-ink-400 tabular-nums">{formatSize(e.size)}</span>
      <a
        href={fileUrl(datasetById(e.ds), e.path, true)}
        title="Download"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink-700 hover:text-ink-100"
      >
        <Download size={15} />
      </a>
    </div>
  );
}
