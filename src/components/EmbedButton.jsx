import { useEffect, useRef, useState } from "react";
import { Check, Code2, Copy } from "lucide-react";
import { DOTADEX } from "../datasets.js";

const SIZES = [
  ["640 × 400", 640, 400],
  ["800 × 500", 800, 500],
  ["1280 × 720", 1280, 720],
];

// The code to show a hero or an item of Dotadex on another site: an iframe of its embed page
// (/Dotadex/embed/<path>), in a size, waiting for a click or starting at once
export default function EmbedButton({ path, title, className = "" }) {
  const [open, setOpen] = useState(false);
  const [size, setSize] = useState(1);
  const [autoplay, setAutoplay] = useState(false);
  const [copied, setCopied] = useState(false);
  const panel = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !panel.current?.parentElement.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const [, width, height] = SIZES[size];
  const [page, query] = path.split("?");
  const params = new URLSearchParams(query || "");
  if (autoplay) params.set("autoplay", "1");
  const src = `${DOTADEX}/embed/${page}${params.toString() ? `?${params}` : ""}`;
  const code = `<iframe src="${src}" width="${width}" height="${height}" title="${title.replace(/"/g, "&quot;")} in 3D, Dotadex" style="border:0;border-radius:12px" allow="fullscreen" loading="lazy"></iframe>`;

  return (
    <div className="relative">
      <button onClick={() => setOpen(!open)} title="Show it on your own site" className={className}>
        <Code2 size={16} /> Embed
      </button>
      {open && (
        <div ref={panel} className="anim-open absolute right-0 bottom-full z-30 mb-2 w-[30rem] rounded-2xl border border-white/[0.08] bg-ink-900 p-5 text-left shadow-2xl shadow-black/60">
          <div className="font-medium">Show {title} on your site</div>
          <p className="mt-1 text-[0.84rem] text-ink-400">Paste this where the 3D view should be. It shows a picture until it is clicked, so a page with several stays light.</p>
          <div className="mt-4 flex flex-wrap items-center gap-1.5">
            {SIZES.map(([label], i) => (
              <button
                key={label}
                onClick={() => setSize(i)}
                className={`h-8 rounded-full px-3 text-[0.82rem] transition-colors ${size === i ? "bg-ink-100 text-ink-950" : "bg-ink-800 text-ink-300 hover:text-ink-100"}`}
              >
                {label}
              </button>
            ))}
            <label className="ml-auto flex cursor-pointer items-center gap-2 text-[0.84rem] text-ink-300 select-none">
              <input type="checkbox" checked={autoplay} onChange={(e) => setAutoplay(e.target.checked)} className="accent-ink-100" />
              Start at once
            </label>
          </div>
          <pre className="mt-3 max-h-32 overflow-auto rounded-xl bg-ink-950 p-3 font-mono text-[0.74rem] leading-relaxed break-all whitespace-pre-wrap text-ink-300">{code}</pre>
          <div className="mt-3 flex gap-2">
            <button
              onClick={async () => {
                await navigator.clipboard.writeText(code);
                setCopied(true);
                setTimeout(() => setCopied(false), 1400);
              }}
              className="flex h-9 flex-1 items-center justify-center gap-2 rounded-lg bg-ink-100 text-[0.88rem] font-medium text-ink-950 hover:bg-white"
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Copied" : "Copy the code"}
            </button>
            <a href={src} target="_blank" rel="noreferrer" className="flex h-9 items-center rounded-lg bg-ink-800 px-3.5 text-[0.88rem] text-ink-300 hover:text-ink-100">
              Preview
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
