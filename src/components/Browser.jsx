import { useEffect, useMemo, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import {
  ArrowDown, ArrowUp, ChevronRight, Download, ExternalLink, FileArchive, FolderDown, LayoutGrid, List, LoaderCircle,
} from "lucide-react";
import { DATASETS, cliCommand, datasetById, fileUrl, hubUrl } from "../datasets.js";
import { KINDS, formatCount, formatSize } from "../lib/format.js";
import { findDir, search } from "../lib/lists.js";
import { navigate } from "../lib/route.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";
import { heroPortrait, imageUrl } from "../lib/catalog.js";
import { Check, EntryIcon } from "./icons.jsx";
import CopyButton from "./CopyButton.jsx";

const ROW = 44;
const CELL = 176;

function readView() {
  try {
    return localStorage.getItem("view") || "list";
  } catch {
    return "list";
  }
}

// One dataset's folders and files (ds), or search results across every dataset (ds null)
export default function Browser({ ds, route, index, error, indexes, catalog, withCopies, setWithCopies, selection, toggle, resolve }) {
  const [view, setView] = useState(readView);
  const [sort, setSort] = useState({ key: "name", desc: false });
  const changeView = (v) => {
    setView(v);
    try {
      localStorage.setItem("view", v);
    } catch {}
  };

  const searching = !!route.q;
  const allMode = !ds;
  const ready = allMode ? Object.keys(indexes).length > 0 : !!index;
  const kind = route.kind;

  const dir = useMemo(() => (index && !allMode ? findDir(index.tree(withCopies), route.dir) : null), [index, route.dir, withCopies, allMode]);

  const { rows, total } = useMemo(() => {
    if (!ready) return { rows: [], total: 0 };
    const order = (a, b) => {
      const r = sort.key === "size" ? a.size - b.size : a.name.localeCompare(b.name, "en", { numeric: true });
      return sort.desc ? -r : r;
    };
    if (searching) {
      const entries = allMode ? DATASETS.flatMap((d) => indexes[d.id]?.entries || []) : index.entries;
      const scope = !allMode && route.dir ? entries.filter((e) => e.path.startsWith(`${route.dir}/`)) : entries;
      const { results, total } = search(scope, route.q, { kind, withCopies });
      return { rows: results.sort(order).map((entry) => ({ entry })), total };
    }
    if (!dir) return { rows: [], total: 0 };
    const dirs = [...dir.dirs.values()].sort(order).map((node) => ({ node }));
    const files = dir.files.filter((f) => !kind || f.kind === kind).sort(order).map((entry) => ({ entry }));
    return { rows: [...dirs, ...files], total: dirs.length + files.length };
  }, [ready, searching, allMode, indexes, index, dir, route.q, route.dir, kind, withCopies, sort]);

  // Across every dataset, the heroes and items of that name come first
  const named = useMemo(() => {
    if (!allMode || !searching || !catalog) return [];
    const words = route.q.toLowerCase().split(/\s+/).filter(Boolean);
    const hit = (name) => words.every((w) => name.toLowerCase().includes(w));
    const heroes = catalog.heroes.filter((h) => hit(h.name)).map((h) => ({ key: h.id, href: `#/hero/${h.key}`, name: h.name, sub: "Hero", icon: heroPortrait(h) }));
    const items = Object.values(catalog.items)
      .filter((i) => hit(i.name))
      .slice(0, 40)
      .map((i) => ({ key: i.id, href: `#/item/${i.id}`, name: i.name, sub: i.type || i.slot, icon: imageUrl(i.icon) }));
    return [...heroes, ...items];
  }, [allMode, searching, catalog, route.q]);

  const scroller = useRef(null);
  const [width, setWidth] = useState(800);
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);
  const columns = view === "grid" ? Math.max(1, Math.floor((width - 24) / CELL)) : 1;
  const lines = Math.ceil(rows.length / columns);
  const virtual = useVirtualizer({ count: lines, getScrollElement: () => scroller.current, estimateSize: () => (view === "grid" ? CELL + 8 : ROW), overscan: 6 });
  useEffect(() => {
    scroller.current?.scrollTo(0, 0);
  }, [route.ds, route.dir, route.q, kind]);
  useEffect(() => {
    virtual.measure();
  }, [view, columns]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (row) => {
    if (row.node) navigate({ ds: ds.id, dir: row.node.path, kind });
    else navigate({ ...route, file: allMode ? `${row.entry.ds}:${row.entry.path}` : row.entry.path });
  };
  const itemOf = (row) =>
    row.node ? { ds: ds.id, path: row.node.path, dir: true } : { ds: row.entry.ds, path: row.entry.path, dir: false, entry: row.entry };
  const keyOf = (row) => (row.node ? `${ds.id}:${row.node.path}/` : `${row.entry.ds}:${row.entry.path}`);
  const activeFile = route.file;

  if (error && !index) {
    return <div className="p-10 text-sm text-ink-400">The file list of {ds.title} could not be loaded: {error}</div>;
  }
  if (!ready) {
    return (
      <div className="flex flex-1 items-center justify-center gap-3 text-sm text-ink-400">
        <LoaderCircle size={16} className="animate-spin" /> Loading the file list…
      </div>
    );
  }
  if (!searching && !dir) {
    return <div className="p-10 text-sm text-ink-400">No folder {route.dir} in {ds.title}.</div>;
  }

  const folderName = dir ? (dir.path ? dir.name : ds.repo) : "";
  const downloadDir = (mode) => {
    const files = resolve([{ ds: ds.id, path: dir.path, dir: true }], dir.path);
    startJob(mode, files, folderName);
  };

  return (
    <>
      <div className="flex shrink-0 flex-col gap-4 border-b border-ink-800 px-6 pt-5 pb-4">
        <div className="flex min-h-8 items-center gap-1 text-sm">
          {searching ? (
            <span className="text-ink-300">
              <span className="text-ink-100 tabular-nums">{formatCount(total)}</span> results for “{route.q}”
              {allMode ? " in every dataset" : ` in ${ds.title}${route.dir ? ` / ${route.dir}` : ""}`}
              {total > rows.length && <span className="text-ink-400"> · first {formatCount(rows.length)} shown</span>}
            </span>
          ) : (
            <Crumbs ds={ds} dir={route.dir} kind={kind} />
          )}
          <div className="flex-1" />
          {!searching && (
            <div className="flex items-center gap-2">
              <span className="mr-2 text-xs text-ink-400 tabular-nums">
                {formatCount(dir.count)} files · {formatSize(dir.size)}
              </span>
              <Action icon={FileArchive} onClick={() => downloadDir("zip")} title="Download this folder as one ZIP">
                ZIP
              </Action>
              {canSaveToFolder() && (
                <Action icon={FolderDown} onClick={() => downloadDir("folder")} title="Save every file into a folder on your disk">
                  To folder
                </Action>
              )}
              <CopyButton text={cliCommand(ds, dir.path)} label="CLI" />
              <a
                href={hubUrl(ds, dir.path, true)}
                target="_blank"
                rel="noreferrer"
                title="Open on Hugging Face"
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-ink-700 bg-ink-850 text-ink-300 hover:border-ink-600 hover:text-ink-100"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
        {named.length > 0 && (
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {named.map((n) => (
              <a key={n.key} href={n.href} className="flex w-44 shrink-0 items-center gap-2.5 rounded-lg border border-ink-800 bg-ink-900 p-1.5 pr-3 hover:border-ink-600">
                <span className="h-9 w-12 shrink-0 overflow-hidden rounded bg-ink-850">
                  {n.icon && <img src={n.icon} alt="" loading="lazy" className="h-full w-full object-cover" />}
                </span>
                <span className="min-w-0 leading-tight">
                  <span className="block truncate text-xs">{n.name}</span>
                  <span className="block truncate text-[11px] text-ink-400">{n.sub}</span>
                </span>
              </a>
            ))}
          </div>
        )}
        <div className="flex items-center gap-1.5">
          <Chip active={!kind} onClick={() => navigate({ ...route, kind: "", file: "" }, true)}>
            All
          </Chip>
          {KINDS.map((k) => (
            <Chip key={k.id} active={kind === k.id} onClick={() => navigate({ ...route, kind: kind === k.id ? "" : k.id, file: "" }, true)}>
              {k.title}
            </Chip>
          ))}
          <div className="flex-1" />
          <label className="mr-3 flex cursor-pointer items-center gap-2 text-xs text-ink-400 select-none hover:text-ink-300">
            <input type="checkbox" checked={withCopies} onChange={(e) => setWithCopies(e.target.checked)} className="accent-accent" />
            Show .gz site copies
          </label>
          <div className="flex rounded-md border border-ink-700 p-0.5">
            {[
              ["list", List],
              ["grid", LayoutGrid],
            ].map(([v, Icon]) => (
              <button
                key={v}
                onClick={() => changeView(v)}
                className={`flex h-7 w-8 items-center justify-center rounded ${view === v ? "bg-ink-700 text-ink-100" : "text-ink-400 hover:text-ink-100"}`}
              >
                <Icon size={14} />
              </button>
            ))}
          </div>
        </div>
      </div>

      {view === "list" && rows.length > 0 && (
        <div className="grid shrink-0 grid-cols-[44px_1fr_110px_90px_44px] items-center border-b border-ink-800 px-3 text-[11px] font-medium tracking-wider text-ink-400 uppercase">
          <span />
          <SortHead sort={sort} setSort={setSort} k="name">
            Name
          </SortHead>
          <span className="py-2">Type</span>
          <SortHead sort={sort} setSort={setSort} k="size" right>
            Size
          </SortHead>
          <span />
        </div>
      )}

      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto">
        {rows.length === 0 && <div className="p-10 text-center text-sm text-ink-400">{searching ? "Nothing found." : "This folder is empty."}</div>}
        <div style={{ height: virtual.getTotalSize(), position: "relative" }} className={view === "grid" ? "mx-3 my-3" : ""}>
          {virtual.getVirtualItems().map((line) => (
            <div key={line.key} style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${line.start}px)` }}>
              {view === "list" ? (
                <ListRow
                  row={rows[line.index]}
                  ds={ds}
                  searching={searching}
                  allMode={allMode}
                  picked={selection.has(keyOf(rows[line.index]))}
                  active={!rows[line.index].node && activeFile === (allMode ? `${rows[line.index].entry.ds}:${rows[line.index].entry.path}` : rows[line.index].entry.path)}
                  onPick={() => toggle(itemOf(rows[line.index]))}
                  onOpen={() => open(rows[line.index])}
                />
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                  {rows.slice(line.index * columns, line.index * columns + columns).map((row) => (
                    <GridCell
                      key={keyOf(row)}
                      row={row}
                      picked={selection.has(keyOf(row))}
                      active={!row.node && activeFile === (allMode ? `${row.entry.ds}:${row.entry.path}` : row.entry.path)}
                      onPick={() => toggle(itemOf(row))}
                      onOpen={() => open(row)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Crumbs({ ds, dir, kind }) {
  const parts = dir ? dir.split("/") : [];
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-1">
      <a href={`#/${ds.id}${kind ? `?kind=${kind}` : ""}`} className={`rounded px-1.5 py-0.5 hover:bg-ink-850 ${parts.length ? "text-ink-400" : "text-ink-100"}`}>
        {ds.title}
      </a>
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight size={14} className="text-ink-600" />
          <button
            onClick={() => navigate({ ds: ds.id, dir: parts.slice(0, i + 1).join("/"), kind })}
            className={`rounded px-1.5 py-0.5 hover:bg-ink-850 ${i === parts.length - 1 ? "text-ink-100" : "text-ink-400"}`}
          >
            {part}
          </button>
        </span>
      ))}
    </div>
  );
}

function Action({ icon: Icon, children, ...props }) {
  return (
    <button
      {...props}
      className="inline-flex h-8 items-center gap-2 rounded-md border border-ink-700 bg-ink-850 px-2.5 text-xs text-ink-300 transition hover:border-ink-600 hover:text-ink-100"
    >
      <Icon size={14} />
      {children}
    </button>
  );
}

function Chip({ active, children, ...props }) {
  return (
    <button
      {...props}
      className={`h-7 rounded-full px-3 text-xs transition ${active ? "bg-ink-100 text-ink-950" : "text-ink-400 hover:bg-ink-850 hover:text-ink-100"}`}
    >
      {children}
    </button>
  );
}

function SortHead({ sort, setSort, k, right, children }) {
  const on = sort.key === k;
  const Arrow = sort.desc ? ArrowDown : ArrowUp;
  return (
    <button
      onClick={() => setSort({ key: k, desc: on ? !sort.desc : k === "size" })}
      className={`flex items-center gap-1 py-2 uppercase hover:text-ink-100 ${right ? "justify-end" : ""} ${on ? "text-ink-300" : ""}`}
    >
      {children}
      {on && <Arrow size={11} />}
    </button>
  );
}

function ListRow({ row, ds, searching, allMode, picked, active, onPick, onOpen }) {
  const e = row.entry;
  const name = row.node ? row.node.name : e.name;
  const sub = row.node ? `${formatCount(row.node.count)} files` : searching ? `${allMode ? `${datasetById(e.ds).title} · ` : ""}${e.path}` : e.title;
  return (
    <div
      onClick={onOpen}
      style={{ height: ROW }}
      className={`group grid cursor-pointer grid-cols-[44px_1fr_110px_90px_44px] items-center px-3 text-sm ${active ? "bg-ink-850" : "hover:bg-ink-900"}`}
    >
      <Check picked={picked} onClick={onPick} />
      <div className="flex min-w-0 items-center gap-3">
        <EntryIcon entry={e} dir={!!row.node} />
        <div className="min-w-0 leading-tight">
          <div className="truncate">
            {searching && e.title ? <span>{e.title}</span> : name}
            {searching && e.title && <span className="ml-2 text-ink-400">{name}</span>}
          </div>
          {sub && <div className="truncate text-xs text-ink-400">{sub}</div>}
        </div>
      </div>
      <span className="truncate text-xs text-ink-400">{row.node ? "Folder" : e.tag || e.ext || "file"}</span>
      <span className="text-right text-xs text-ink-400 tabular-nums">{formatSize(row.node ? row.node.size : e.size)}</span>
      <span className="flex justify-end">
        {!row.node && (
          <a
            href={fileUrl(datasetById(e.ds), e.path, true)}
            onClick={(ev) => ev.stopPropagation()}
            title="Download"
            className="flex h-7 w-7 items-center justify-center rounded text-ink-400 opacity-0 group-hover:opacity-100 hover:bg-ink-700 hover:text-ink-100"
          >
            <Download size={14} />
          </a>
        )}
      </span>
    </div>
  );
}

function GridCell({ row, picked, active, onPick, onOpen }) {
  const e = row.entry;
  const thumb = e?.kind === "image" ? fileUrl(datasetById(e.ds), e.path) : null;
  return (
    <div
      onClick={onOpen}
      style={{ height: CELL }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-lg border transition ${active ? "border-ink-400 bg-ink-850" : "border-ink-800 bg-ink-900 hover:border-ink-600"}`}
    >
      <div className={`flex min-h-0 flex-1 items-center justify-center ${thumb ? "checker" : ""}`}>
        {thumb ? (
          <img src={thumb} loading="lazy" decoding="async" alt="" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <EntryIcon entry={e} dir={!!row.node} size={30} />
        )}
      </div>
      <div className="shrink-0 border-t border-ink-800 px-2.5 py-2 leading-tight">
        <div className="truncate text-xs">{row.node ? row.node.name : e.title || e.name}</div>
        <div className="truncate text-[11px] text-ink-400">{row.node ? `${formatCount(row.node.count)} files` : formatSize(e.size)}</div>
      </div>
      <div className={`absolute top-1.5 left-1.5 ${picked ? "" : "opacity-0 group-hover:opacity-100"}`}>
        <Check picked={picked} onClick={onPick} boxed />
      </div>
    </div>
  );
}
