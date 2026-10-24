import { lazy, Suspense, useEffect, useState } from "react";
import { Download, ExternalLink, LoaderCircle, X } from "lucide-react";
import { fileUrl, hubUrl } from "../datasets.js";
import { formatSize } from "../lib/format.js";
import CopyButton from "./CopyButton.jsx";

const ModelPreview = lazy(() => import("./ModelPreview.jsx"));

const TEXT_LIMIT = 3 * 1024 * 1024;

export default function Preview({ entry, ds, onClose }) {
  const url = fileUrl(ds, entry.path);
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <aside className="flex w-[440px] shrink-0 flex-col border-l border-ink-800 bg-ink-900/40">
      <div className="flex h-12 shrink-0 items-center gap-2 border-b border-ink-800 pr-2 pl-5">
        <span className="min-w-0 flex-1 truncate text-sm font-medium">{entry.title || entry.name}</span>
        <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-md text-ink-400 hover:bg-ink-850 hover:text-ink-100">
          <X size={16} />
        </button>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="h-80 border-b border-ink-800">
          <Body key={entry.path} entry={entry} ds={ds} url={url} />
        </div>
        <div className="space-y-5 p-5">
          <a
            href={fileUrl(ds, entry.path, true)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-ink-100 text-sm font-medium text-ink-950 transition hover:bg-white"
          >
            <Download size={16} /> Download · {formatSize(entry.size)}
          </a>
          {entry.hasGz && (
            <a href={fileUrl(ds, `${entry.path}.gz`, true)} className="-mt-3 block text-center text-xs text-ink-400 hover:text-ink-100">
              or the gzipped copy (.gz)
            </a>
          )}
          <dl className="space-y-3 text-sm">
            {entry.title && <Field label="Name">{entry.title}</Field>}
            {entry.tag && <Field label="Kind">{entry.tag}</Field>}
            <Field label="File">{entry.name}</Field>
            <Field label="Path">
              <span className="font-mono text-xs break-all text-ink-300">{entry.path}</span>
            </Field>
            <Field label="Dataset">{ds.repo}</Field>
          </dl>
          <div className="flex gap-2">
            <CopyButton text={url} label="Copy link" />
            <CopyButton text={entry.path} label="Copy path" />
            <a
              href={hubUrl(ds, entry.path)}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-8 items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 text-xs text-ink-300 hover:border-ink-600 hover:text-ink-100"
            >
              <ExternalLink size={14} /> Hub
            </a>
          </div>
        </div>
      </div>
    </aside>
  );
}

function Field({ label, children }) {
  return (
    <div>
      <dt className="text-[11px] tracking-wider text-ink-400 uppercase">{label}</dt>
      <dd className="mt-0.5">{children}</dd>
    </div>
  );
}

function Centered({ children }) {
  return <div className="flex h-full items-center justify-center p-6 text-center text-sm text-ink-400">{children}</div>;
}

function Body({ entry, ds, url }) {
  if (entry.kind === "image") return <ImageBody url={url} />;
  if (entry.kind === "video") return <video src={url} controls className="h-full w-full bg-black object-contain" />;
  if (entry.kind === "audio") {
    return (
      <Centered>
        <audio src={url} controls className="w-full" />
      </Centered>
    );
  }
  if (entry.kind === "model") {
    return (
      <Suspense fallback={<Spinner />}>
        <ModelPreview url={entry.hasGz ? fileUrl(ds, `${entry.path}.gz`) : url} gz={entry.hasGz} />
      </Suspense>
    );
  }
  if (entry.kind === "text" || entry.ext === "gz") {
    if (entry.size > TEXT_LIMIT) return <Centered>Too big to preview here ({formatSize(entry.size)}). Download it to open.</Centered>;
    return <TextBody url={url} gz={entry.ext === "gz"} json={entry.ext === "json" || entry.path.endsWith(".json.gz")} />;
  }
  return <Centered>No preview for .{entry.ext || "this"} files.</Centered>;
}

function Spinner() {
  return (
    <Centered>
      <LoaderCircle size={18} className="animate-spin" />
    </Centered>
  );
}

function ImageBody({ url }) {
  const [size, setSize] = useState(null);
  return (
    <div className="checker relative flex h-full items-center justify-center p-4">
      <img src={url} alt="" onLoad={(e) => setSize([e.target.naturalWidth, e.target.naturalHeight])} className="max-h-full max-w-full object-contain" />
      {size && <span className="absolute right-2 bottom-2 rounded bg-ink-950/80 px-1.5 py-0.5 text-[11px] text-ink-300 tabular-nums">{size.join(" × ")}</span>}
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
  if (error) return <Centered>Could not load: {error}</Centered>;
  if (text == null) return <Spinner />;
  return <pre className="h-full overflow-auto p-4 font-mono text-[11.5px] leading-relaxed whitespace-pre text-ink-300">{text}</pre>;
}
