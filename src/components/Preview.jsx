import { lazy, Suspense, useEffect, useRef, useState } from "react";
import Related from "./Related.jsx";
import { Copy, Check, Download, ExternalLink, Pause, Play, X } from "lucide-react";
import { fileUrl, hubUrl } from "../datasets.js";
import { formatSize } from "../lib/format.js";
import { Button } from "./ui.jsx";

const HeroViewer = lazy(() => import("./HeroViewer.jsx"));

const TEXT_LIMIT = 3 * 1024 * 1024;

// A file opened in a window over the page: the file itself large on a stage (a picture, a sound in
// its player, a video, a model in 3D, a text), and beside it its name, where it lives and its download
export default function Preview({ entry, ds, onClose }) {
  const url = fileUrl(ds, entry.path);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  const folder = entry.path.slice(0, entry.path.lastIndexOf("/"));

  return (
    <div className="anim-fade fixed inset-0 z-40 bg-black/70 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={entry.name} onClick={onClose}>
      <div className="anim-open absolute inset-x-[6%] inset-y-[7%] grid grid-cols-[minmax(0,1fr)_23rem] gap-4" onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-2xl border border-white/[0.06] bg-[radial-gradient(circle_at_50%_42%,#2e2e33_0%,#1d1d20_50%,#141416_100%)]">
          <Body key={entry.path} entry={entry} ds={ds} url={url} />
        </div>

        <aside className="flex min-h-0 flex-col rounded-2xl border border-white/[0.06] bg-ink-900 p-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <h2 className="text-[1.25rem] leading-tight font-semibold tracking-[-0.02em] break-words">{entry.title || entry.name}</h2>
              {entry.title && <p className="mt-1 truncate text-[0.86rem] text-ink-400">{entry.name}</p>}
            </div>
            <button onClick={onClose} title="Close (Esc)" aria-label="Close" className="-mt-1 -mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100">
              <X size={19} />
            </button>
          </div>
          {entry.tag && <span className="mt-3 w-fit rounded-full bg-ink-800 px-3 py-1 text-[0.8rem] text-ink-300 capitalize">{entry.tag}</span>}

          <div className="mt-6 flex flex-col gap-2">
            <Button primary as="a" href={fileUrl(ds, entry.path, true)}>
              <Download size={16} /> Download <span className="font-normal opacity-55">{formatSize(entry.size)}</span>
            </Button>
            {entry.hasGz && (
              <Button as="a" href={fileUrl(ds, `${entry.path}.gz`, true)}>
                Gzipped copy
              </Button>
            )}
          </div>

          <div className="mt-7 min-h-0 space-y-4 overflow-y-auto border-t border-white/[0.06] pt-5 text-[0.88rem]">
            <Related ds={ds.id} path={entry.path} />
            <div>
              <div className="text-ink-400">Folder</div>
              <div className="mt-1 break-all text-ink-300">{folder}</div>
            </div>
            <div>
              <div className="text-ink-400">Dataset</div>
              <div className="mt-1 text-ink-300">{ds.repo}</div>
            </div>
          </div>
          <div className="flex-1" />
          <div className="mt-6 flex gap-2">
            <Copier text={url} label="Copy link" />
            <Copier text={entry.path} label="Copy path" />
            <a href={hubUrl(ds, entry.path)} target="_blank" rel="noreferrer" title="Open on Hugging Face" className="flex h-9 w-9 items-center justify-center rounded-lg bg-ink-800 text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100">
              <ExternalLink size={15} />
            </a>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Copier({ text, label }) {
  const [done, setDone] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setDone(true);
        setTimeout(() => setDone(false), 1200);
      }}
      className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-ink-800 text-[0.84rem] text-ink-300 transition-colors hover:bg-ink-700 hover:text-ink-100"
    >
      {done ? <Check size={14} /> : <Copy size={14} />} {done ? "Copied" : label}
    </button>
  );
}

function Centered({ children }) {
  return <div className="flex h-full items-center justify-center p-10 text-center text-ink-400">{children}</div>;
}

function Body({ entry, ds, url }) {
  if (entry.kind === "image") return <ImageBody url={url} />;
  if (entry.kind === "video") return <video src={url} controls autoPlay className="h-full w-full object-contain" />;
  if (entry.kind === "audio") return <AudioBody url={url} name={entry.title || entry.name} />;
  if (entry.kind === "model") {
    return (
      <Suspense fallback={null}>
        <HeroViewer models={[entry]} bare />
      </Suspense>
    );
  }
  if (entry.kind === "text" || entry.ext === "gz") {
    if (entry.size > TEXT_LIMIT) return <Centered>This file is {formatSize(entry.size)}, too big to show here. Download it to open it.</Centered>;
    return <TextBody url={url} gz={entry.ext === "gz"} json={entry.ext === "json" || entry.path.endsWith(".json.gz")} />;
  }
  return <Centered>A .{entry.ext || "file"} cannot be shown here. Download it to open it.</Centered>;
}

function Loading() {
  return (
    <Centered>
      <span className="h-5 w-5 animate-spin rounded-full border-2 border-ink-600 border-t-ink-100" />
    </Centered>
  );
}

function ImageBody({ url }) {
  const [size, setSize] = useState(null);
  return (
    <div className="relative flex h-full items-center justify-center p-10">
      <img src={url} alt="" onLoad={(e) => setSize([e.target.naturalWidth, e.target.naturalHeight])} className="max-h-full max-w-full object-contain drop-shadow-2xl" />
      {size && <span className="absolute bottom-4 left-4 rounded-md bg-black/45 px-2 py-1 text-[0.78rem] text-ink-300 tabular-nums backdrop-blur">{size.join(" × ")}</span>}
    </div>
  );
}

const clock = (t) => (Number.isFinite(t) ? `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, "0")}` : "0:00");

// A sound in a player of the site's own: a large play button, a bar to seek, the time; it starts at once
function AudioBody({ url, name }) {
  const audio = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [length, setLength] = useState(0);
  useEffect(() => {
    audio.current?.play().catch(() => {});
  }, []);
  const toggle = () => (audio.current.paused ? audio.current.play() : audio.current.pause());
  const share = length ? time / length : 0;
  return (
    <div className="flex h-full flex-col items-center justify-center gap-10 p-12">
      <audio
        ref={audio}
        src={url}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onLoadedMetadata={(e) => setLength(e.currentTarget.duration)}
      />
      <div className="flex h-24 items-end gap-[3px]" aria-hidden="true">
        {Array.from({ length: 48 }, (_, i) => {
          const h = 18 + 70 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.43));
          return <span key={i} className={`w-[5px] rounded-full transition-colors duration-200 ${i / 48 < share ? "bg-ink-100" : "bg-ink-600"}`} style={{ height: `${h}%` }} />;
        })}
      </div>
      <div className="w-full max-w-lg">
        <input
          type="range"
          min={0}
          max={length || 0}
          step={0.01}
          value={time}
          onChange={(e) => (audio.current.currentTime = Number(e.target.value))}
          aria-label={`Position in ${name}`}
          className="h-1 w-full cursor-pointer appearance-none rounded-full bg-ink-700 accent-ink-100"
          style={{ background: `linear-gradient(to right, #f5f5f6 ${share * 100}%, #2b2b2f ${share * 100}%)` }}
        />
        <div className="mt-2 flex justify-between text-[0.82rem] text-ink-400 tabular-nums">
          <span>{clock(time)}</span>
          <span>{clock(length)}</span>
        </div>
      </div>
      <button onClick={toggle} aria-label={playing ? "Pause" : "Play"} className="flex h-16 w-16 items-center justify-center rounded-full bg-ink-100 text-ink-950 transition-transform hover:scale-105 active:scale-95">
        {playing ? <Pause size={26} fill="currentColor" /> : <Play size={26} fill="currentColor" className="translate-x-0.5" />}
      </button>
    </div>
  );
}

function TextBody({ url, gz, json }) {
  const [text, setText] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let live = true;
    (async () => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      let body = gz ? await new Response(res.body.pipeThrough(new DecompressionStream("gzip"))).text() : await res.text();
      if (json) {
        try {
          body = JSON.stringify(JSON.parse(body), null, 2);
        } catch {}
      }
      if (live) setText(body.length > 400_000 ? `${body.slice(0, 400_000)}\n…` : body);
    })().catch((e) => live && setError(String(e.message || e)));
    return () => {
      live = false;
    };
  }, [url, gz, json]);
  if (error) return <Centered>The file could not be read: {error}</Centered>;
  if (text == null) return <Loading />;
  return <pre className="h-full overflow-auto p-6 font-mono text-[0.78rem] leading-relaxed whitespace-pre text-ink-300">{text}</pre>;
}
