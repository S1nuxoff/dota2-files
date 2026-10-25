import { useEffect, useMemo, useRef, useState } from "react";
import { ChevronRight, Download, Pause, Play } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatCount, formatSize } from "../lib/format.js";
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

// What a line is about, from its name: auto_axe_ability_berserk_03.mp3 -> ability berserk,
// axe_attack_07.mp3 -> attack (the speaker's name, "auto" and the number off); topics of fewer than
// three lines go together
const topicOf = (name, speaker, pack = "") => {
  const parts = name.replace(/\.\w+$/, "").replace(/_\d+[a-z]?$/, "").split("_").filter((p) => p !== "auto" && p !== speaker && p !== pack);
  return (parts[0] === "ability" || parts[0] === "item" ? parts.slice(0, 2) : parts.slice(0, 1)).join(" ") || "other";
};

// A hero's sounds: grouped by what they are, each line played in place, one at a time; the files
// that are not sounds (phonemes) under them
export default function SoundList({ files, route }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState("");
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

  const sounds = files.filter((e) => e.kind === "audio");
  const others = files.filter((e) => e.kind !== "audio");
  const groups = useMemo(() => {
    const byKind = new Map();
    for (const e of sounds) {
      const k = kindOf(e.path);
      if (!byKind.has(k)) byKind.set(k, []);
      byKind.get(k).push(e);
    }
    // A kind's lines in topics; a topic holding a big share of them is another voice pack of the
    // hero (axe_jung_*: Jungle Axe), its own group with its own topics
    const topicsOf = (list, pack) => {
      const byTopic = new Map();
      for (const e of list) {
        const t = topicOf(e.name, e.path.split("/").at(-2), pack);
        if (!byTopic.has(t)) byTopic.set(t, []);
        byTopic.get(t).push(e);
      }
      return byTopic;
    };
    const out = [];
    for (const [kind, list] of [...byKind.entries()].sort((a, b) => b[1].length - a[1].length)) {
      list.sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
      if (list.length < 30) {
        out.push({ kind, list, topics: null });
        continue;
      }
      const packs = [];
      for (const [t, l] of topicsOf(list)) if (l.length >= 60 && l.length > list.length * 0.25) packs.push([t, l]);
      const own = list.filter((e) => !packs.some(([, l]) => l.includes(e)));
      for (const [kindList, pack, title] of [[own, "", kind], ...packs.map(([t, l]) => [l, t, `${kind}: ${t[0].toUpperCase()}${t.slice(1)}`])]) {
        const topics = [];
        const rest = [];
        for (const [t, l] of topicsOf(kindList, pack)) (l.length >= 3 ? topics.push([t, l]) : rest.push(...l));
        topics.sort((a, b) => b[1].length - a[1].length);
        if (rest.length) topics.push(["other", rest]);
        if (kindList.length) out.push({ kind: title, list: kindList, topics });
      }
    }
    return out;
  }, [sounds]);

  const rows = (list) => (
    <div className="divide-y divide-white/[0.04]">
      {list.map((e) => (
        <SoundRow key={e.path} e={e} playing={playing === e.path} onPlay={() => play(e)} />
      ))}
    </div>
  );

  return (
    <div className="space-y-10">
      {groups.map(({ kind, list, topics }) => (
        <section key={kind}>
          <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">
            {kind} <span className="ml-1 font-normal text-ink-400">{formatCount(list.length)}</span>
          </h3>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900">
            {topics
              ? topics.map(([topic, l]) => (
                  <details key={topic} className="group border-b border-white/[0.06] last:border-b-0">
                    <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3 transition-colors select-none hover:bg-ink-850">
                      <ChevronRight size={16} className="text-ink-400 transition-transform group-open:rotate-90" />
                      <span className="flex-1 text-[0.92rem] capitalize">{topic.replace(/_/g, " ")}</span>
                      <span className="text-[0.82rem] text-ink-400 tabular-nums">{l.length}</span>
                    </summary>
                    <div className="border-t border-white/[0.04]">{rows(l)}</div>
                  </details>
                ))
              : rows(list)}
          </div>
        </section>
      ))}
      {groups.length === 0 && <p className="py-10 text-center text-ink-400">No sounds.</p>}

      {others.length > 0 && (
        <section>
          <h3 className="text-[1.15rem] font-semibold tracking-[-0.02em]">
            Other sound files <span className="ml-1 font-normal text-ink-400">{others.length}</span>
          </h3>
          <p className="mt-1 text-[0.88rem] text-ink-400">The voice lines' phonemes for lip sync, as JSON</p>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 p-2">
            <FileTable entries={others} route={route} height={`${Math.min(20, others.length * 2.75 + 0.5)}rem`} />
          </div>
        </section>
      )}
    </div>
  );
}

function SoundRow({ e, playing, onPlay }) {
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
        <div className="truncate text-[0.76rem] text-ink-400">{e.path.slice(0, e.path.lastIndexOf("/"))}</div>
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
