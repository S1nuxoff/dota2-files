import { useEffect, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download } from "lucide-react";
import { datasetById, fileUrl } from "../datasets.js";
import { formatSize } from "../lib/format.js";
import { navigate } from "../lib/route.js";
import { useRem } from "../lib/scale.js";
import { EntryIcon } from "./icons.jsx";

// In rem (lib/scale.js)
const ROW = 2.75;
const CELL = 10.5;

// A flat list (or a grid of pictures) of files from any datasets, inside a page that scrolls itself.
// Clicking a file opens it in the preview (<dataset>:<path> in the route)
export default function FileTable({ entries, route, grid, height = "100%" }) {
  const scroller = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = scroller.current;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const rem = useRem();
  const columns = grid ? Math.max(1, Math.floor((width - 8) / (CELL * rem))) : 1;
  const virtual = useVirtualizer({
    count: Math.ceil(entries.length / columns),
    getScrollElement: () => scroller.current,
    estimateSize: () => (grid ? (CELL + 0.5) * rem : ROW * rem),
    overscan: 6,
  });
  useEffect(() => {
    virtual.measure();
  }, [grid, columns]); // eslint-disable-line react-hooks/exhaustive-deps
  const keyOf = (e) => `${e.ds}:${e.path}`;
  const open = (e) => navigate({ ...route, file: keyOf(e) });

  return (
    <div ref={scroller} style={{ height }} className="overflow-y-auto">
      {entries.length === 0 && <div className="p-10 text-center text-sm text-ink-400">No files.</div>}
      <div style={{ height: virtual.getTotalSize(), position: "relative" }}>
        {virtual.getVirtualItems().map((line) => (
          <div key={line.key} style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${line.start}px)` }}>
            {grid ? (
              <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                {entries.slice(line.index * columns, line.index * columns + columns).map((e) => (
                  <Cell key={keyOf(e)} e={e} active={route.file === keyOf(e)} onOpen={() => open(e)} />
                ))}
              </div>
            ) : (
              <Row e={entries[line.index]} active={route.file === keyOf(entries[line.index])} onOpen={() => open(entries[line.index])} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ e, active, onOpen }) {
  const dir = e.path.slice(0, e.path.lastIndexOf("/"));
  return (
    <div
      onClick={onOpen}
      style={{ height: `${ROW}rem` }}
      className={`group flex cursor-pointer items-center gap-3 rounded-lg px-3 text-[0.9rem] transition-colors ${active ? "bg-ink-800" : "hover:bg-ink-850"}`}
    >
      <EntryIcon entry={e} />
      <div className="min-w-0 flex-1 leading-tight">
        <div className="truncate">
          {e.title ? (
            <>
              {e.title}
              <span className="ml-2 text-ink-400">{e.name}</span>
            </>
          ) : (
            e.name
          )}
        </div>
        <div className="truncate text-xs text-ink-400">{dir}</div>
      </div>
      <span className="w-20 text-right text-xs text-ink-400 tabular-nums">{formatSize(e.size)}</span>
      <a
        href={fileUrl(datasetById(e.ds), e.path, true)}
        onClick={(ev) => ev.stopPropagation()}
        title="Download"
        className="flex h-7 w-7 items-center justify-center rounded text-ink-400 opacity-0 group-hover:opacity-100 hover:bg-ink-700 hover:text-ink-100"
      >
        <Download size={14} />
      </a>
    </div>
  );
}

function Cell({ e, active, onOpen }) {
  return (
    <div
      onClick={onOpen}
      style={{ height: `${CELL}rem` }}
      className={`flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-colors ${active ? "border-white/30" : "border-white/[0.06] hover:border-white/[0.14]"}`}
    >
      <div className="checker flex min-h-0 flex-1 items-center justify-center">
        {e.kind === "image" ? (
          <img src={fileUrl(datasetById(e.ds), e.path)} loading="lazy" decoding="async" alt="" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <EntryIcon entry={e} size={28} />
        )}
      </div>
      <div className="shrink-0 border-t border-white/[0.06] bg-ink-850 px-2.5 py-1.5 leading-tight">
        <div className="truncate text-xs">{e.title || e.name}</div>
        <div className="truncate text-[11px] text-ink-400">{formatSize(e.size)}</div>
      </div>
    </div>
  );
}
