import { useMemo } from "react";
import { FileArchive, FolderDown, X } from "lucide-react";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";

export default function SelectionBar({ selection, clear, resolve, route }) {
  const items = useMemo(() => [...selection.values()], [selection]);
  // Names inside the ZIP are relative to the folder open now when every pick is inside it
  const base = route.ds && route.ds !== "all" && items.every((i) => i.ds === route.ds && i.path.startsWith(`${route.dir}/`)) ? route.dir : "";
  const files = useMemo(() => resolve(items, base), [items, base, resolve]);
  if (!items.length) return null;
  const bytes = files.reduce((s, f) => s + f.size, 0);
  const run = (mode) => {
    startJob(mode, files, `dota2-${formatCount(files.length).replace(/,/g, "")}-files`);
    clear();
  };
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-5 flex justify-center">
      <div className="pointer-events-auto flex items-center gap-4 rounded-xl border border-ink-700 bg-ink-850/95 py-2 pr-2 pl-4 shadow-2xl shadow-black/50 backdrop-blur">
        <span className="text-sm">
          <span className="tabular-nums">{formatCount(files.length)}</span> files
          <span className="ml-2 text-ink-400 tabular-nums">{formatSize(bytes)}</span>
        </span>
        <button onClick={() => run("zip")} className="inline-flex h-8 items-center gap-2 rounded-lg bg-ink-100 px-3 text-xs font-medium text-ink-950 hover:bg-white">
          <FileArchive size={14} /> Download ZIP
        </button>
        {canSaveToFolder() && (
          <button onClick={() => run("folder")} className="inline-flex h-8 items-center gap-2 rounded-lg border border-ink-600 px-3 text-xs text-ink-300 hover:text-ink-100">
            <FolderDown size={14} /> To folder
          </button>
        )}
        <button onClick={clear} title="Clear" className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 hover:bg-ink-700 hover:text-ink-100">
          <X size={15} />
        </button>
      </div>
    </div>
  );
}
