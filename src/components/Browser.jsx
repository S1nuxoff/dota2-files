import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useWindowVirtualizer } from "@tanstack/react-virtual";
import { ArrowDown, ArrowUp, Download, ExternalLink, FileArchive, FolderDown, LayoutGrid, List, LoaderCircle } from "lucide-react";
import { DATASETS, cliCommand, datasetById, fileUrl, hubUrl } from "../datasets.js";
import { KINDS, formatCount, formatSize } from "../lib/format.js";
import { findDir, search } from "../lib/lists.js";
import { navigate, link } from "../lib/route.js";
import { startJob } from "../lib/jobs.js";
import { canSaveToFolder } from "../lib/download.js";
import { heroPortrait, imageUrl } from "../lib/catalog.js";
import { useRem } from "../lib/scale.js";
import { Check, EntryIcon } from "./icons.jsx";
import { Button, Crumbs, Empty, Page, SearchField, Segmented, Toolbar } from "./ui.jsx";
import CopyButton from "./CopyButton.jsx";

// In rem (lib/scale.js)
const ROW = 2.75;
const CELL = 10;

function readView() {
  try {
    return localStorage.getItem("view") || "list";
  } catch {
    return "list";
  }
}

// One dataset's folders and files (ds), or search results across every dataset (ds null). The list
// scrolls with the window; its search, kinds and view stick under the site's bar
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
  // Only a kind of file filters (a hero page's tab, kind=sounds, may come along in an old link)
  const kind = KINDS.some((k) => k.id === route.kind) ? route.kind : undefined;

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
    const heroes = catalog.heroes.filter((h) => hit(h.name)).map((h) => ({ key: h.id, href: link(`/hero/${h.key}`), name: h.name, sub: "Hero", icon: heroPortrait(h) }));
    const items = Object.values(catalog.items)
      .filter((i) => hit(i.name))
      .slice(0, 40)
      .map((i) => ({ key: i.id, href: link(`/item/${i.id}`), name: i.name, sub: i.type || i.slot, icon: imageUrl(i.icon) }));
    return [...heroes, ...items];
  }, [allMode, searching, catalog, route.q]);

  // The list's width sets the grid's columns, its top the virtual list's margin
  const list = useRef(null);
  const [width, setWidth] = useState(800);
  const [margin, setMargin] = useState(0);
  useLayoutEffect(() => {
    const el = list.current;
    if (!el) return;
    const update = () => {
      setWidth(el.clientWidth);
      setMargin(el.getBoundingClientRect().top + window.scrollY);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    ro.observe(document.body);
    return () => ro.disconnect();
  }, [ready, !!dir, searching]); // eslint-disable-line react-hooks/exhaustive-deps
  const rem = useRem();
  const columns = view === "grid" ? Math.max(2, Math.floor((width + 8) / (CELL * rem))) : 1;
  const lines = Math.ceil(rows.length / columns);
  const virtual = useWindowVirtualizer({ count: lines, estimateSize: () => (view === "grid" ? (CELL + 0.5) * rem : ROW * rem), overscan: 8, scrollMargin: margin });
  useEffect(() => {
    virtual.measure();
  }, [view, columns]); // eslint-disable-line react-hooks/exhaustive-deps

  // The page's own search, in this dataset (and folder): typing searches, one history entry per search
  const [text, setText] = useState(route.q);
  useEffect(() => setText(route.q), [route.q]);
  useEffect(() => {
    if (text === route.q) return;
    const t = setTimeout(() => navigate({ ds: route.ds, dir: route.dir, q: text, kind }, !!route.q), 250);
    return () => clearTimeout(t);
  }, [text]); // eslint-disable-line react-hooks/exhaustive-deps

  const open = (row) => {
    if (row.node) navigate({ ds: ds.id, dir: row.node.path, kind });
    else navigate({ ...route, file: allMode ? `${row.entry.ds}:${row.entry.path}` : row.entry.path });
  };
  const itemOf = (row) => (row.node ? { ds: ds.id, path: row.node.path, dir: true } : { ds: row.entry.ds, path: row.entry.path, dir: false, entry: row.entry });
  const keyOf = (row) => (row.node ? `${ds.id}:${row.node.path}/` : `${row.entry.ds}:${row.entry.path}`);
  const isActive = (row) => !row.node && route.file === (allMode ? `${row.entry.ds}:${row.entry.path}` : row.entry.path);

  if (error && !index) {
    return (
      <Page>
        <Empty title={`The file list of ${ds.title} could not be loaded`} text={error} />
      </Page>
    );
  }
  if (!ready) {
    return (
      <Page className="flex flex-1 items-center justify-center gap-3 text-sm text-ink-400">
        <LoaderCircle size={16} className="animate-spin" /> Loading the file list…
      </Page>
    );
  }
  if (!searching && !dir) {
    return (
      <Page>
        <Empty title="No such folder" text={`${ds.title} has no folder ${route.dir}.`} />
      </Page>
    );
  }

  const folderName = dir ? (dir.path ? dir.name : ds.repo) : "";
  const downloadDir = (mode) => startJob(mode, resolve([{ ds: ds.id, path: dir.path, dir: true }], dir.path), folderName);
  const parts = !allMode && route.dir ? route.dir.split("/") : [];
  const crumbs = [["/files", "Files"], ...(allMode ? [["", "Search"]] : [[`/${ds.id}`, ds.title], ...parts.map((p, i) => [`/${ds.id}/${parts.slice(0, i + 1).join("/")}`, p])])];
  const cols = "grid-cols-[2.25rem_1fr_4.5rem] sm:grid-cols-[2.75rem_1fr_7rem_5.5rem_2.75rem]";

  return (
    <Page className="flex flex-1 flex-col">
      <header className="page-x flex flex-col items-center pt-8 pb-5 text-center sm:pt-12">
        <Crumbs items={crumbs} className="[&>ol]:justify-center" />
        <div className="mt-5 flex max-w-full flex-col items-center gap-5">
          <div className="max-w-full min-w-0">
            <h1 className="truncate text-[clamp(1.8rem,3.6vw,2.9rem)] leading-tight font-semibold tracking-[-0.035em]">{searching ? `“${route.q}”` : dir.path ? dir.name : ds.title}</h1>
            <p className="mt-1.5 text-[0.88rem] text-ink-400 tabular-nums">
              {searching ? (
                <>
                  {formatCount(total)} results {allMode ? "in every dataset" : `in ${ds.title}${route.dir ? ` / ${route.dir}` : ""}`}
                  {total > rows.length && ` · first ${formatCount(rows.length)} shown`}
                </>
              ) : (
                <>
                  {formatCount(dir.count)} files · {formatSize(dir.size)}
                  {!dir.path && <span className="max-md:hidden"> · {ds.blurb}</span>}
                </>
              )}
            </p>
          </div>
          {!searching && (
            <div className="flex flex-wrap items-center justify-center gap-2">
              <Button primary size="sm" onClick={() => downloadDir("zip")} title="Download this folder as one ZIP">
                <FileArchive size={15} /> Download ZIP
              </Button>
              {canSaveToFolder() && (
                <Button size="sm" onClick={() => downloadDir("folder")} title="Save every file into a folder on your disk">
                  <FolderDown size={15} /> To a folder
                </Button>
              )}
              <CopyButton text={cliCommand(ds, dir.path)} label="CLI" />
              <a
                href={hubUrl(ds, dir.path, true)}
                target="_blank"
                rel="noreferrer"
                title="Open on Hugging Face"
                aria-label="Open on Hugging Face"
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/[0.08] bg-ink-850 text-ink-300 transition-colors hover:border-white/[0.16] hover:text-ink-100"
              >
                <ExternalLink size={14} />
              </a>
            </div>
          )}
        </div>
      </header>

      <Toolbar
        below={
          view === "list" &&
          rows.length > 0 && (
            <div className="page-x">
              <div className={`grid ${cols} items-center border-t border-white/[0.05] text-[0.78rem] text-ink-500 sm:px-2`}>
                <span />
                <SortHead sort={sort} setSort={setSort} k="name">
                  Name
                </SortHead>
                <span className="hidden py-2 sm:block">Type</span>
                <SortHead sort={sort} setSort={setSort} k="size" right>
                  Size
                </SortHead>
                <span className="hidden sm:block" />
              </div>
            </div>
          )
        }
      >
        {!allMode && <SearchField value={text} onChange={setText} placeholder={`Search in ${route.dir ? dir?.name || ds.title : ds.title}`} className="w-full sm:w-72" />}
        <Segmented
          label="Kind of file"
          value={kind || ""}
          onChange={(k) => navigate({ ...route, kind: k, file: "" }, true)}
          items={[["", "All"], ...KINDS.map((k) => [k.id, k.title])]}
          className="max-sm:w-full"
        />
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-2 text-[0.8rem] text-ink-400 select-none hover:text-ink-300" title="Show the site's lighter .gz copies of models and data files">
            <input type="checkbox" checked={withCopies} onChange={(e) => setWithCopies(e.target.checked)} className="accent-ink-100" />
            .gz copies
          </label>
          <Segmented
            label="View"
            value={view}
            onChange={changeView}
            items={[
              ["list", <List key="l" size={15} aria-label="List" />],
              ["grid", <LayoutGrid key="g" size={15} aria-label="Grid" />],
            ]}
          />
        </div>
      </Toolbar>

      {named.length > 0 && (
        <div className="page-x no-bar flex gap-2 overflow-x-auto pt-4">
          {named.map((n) => (
            <a key={n.key} href={n.href} className="flex w-48 shrink-0 items-center gap-2.5 rounded-xl border border-white/[0.07] bg-ink-900 p-1.5 pr-3 transition-colors hover:border-white/[0.16]">
              <span className="h-9 w-12 shrink-0 overflow-hidden rounded-lg bg-ink-850">{n.icon && <img src={n.icon} alt="" loading="lazy" className="h-full w-full object-cover" />}</span>
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-[0.84rem]">{n.name}</span>
                <span className="block truncate text-[0.74rem] text-ink-400">{n.sub}</span>
              </span>
            </a>
          ))}
        </div>
      )}

      <div className="page-x flex-1 pt-1 pb-10">
        {rows.length === 0 && <Empty title={searching ? "Nothing found" : "This folder is empty"} text={searching ? "Try fewer or shorter words." : undefined} />}
        <div ref={list} style={{ height: virtual.getTotalSize(), position: "relative" }} className={view === "grid" ? "mt-3" : ""}>
          {virtual.getVirtualItems().map((line) => (
            <div key={line.key} style={{ position: "absolute", top: 0, left: 0, right: 0, transform: `translateY(${line.start - virtual.options.scrollMargin}px)` }}>
              {view === "list" ? (
                <ListRow
                  row={rows[line.index]}
                  cols={cols}
                  searching={searching}
                  allMode={allMode}
                  picked={selection.has(keyOf(rows[line.index]))}
                  active={isActive(rows[line.index])}
                  onPick={() => toggle(itemOf(rows[line.index]))}
                  onOpen={() => open(rows[line.index])}
                />
              ) : (
                <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
                  {rows.slice(line.index * columns, line.index * columns + columns).map((row) => (
                    <GridCell key={keyOf(row)} row={row} picked={selection.has(keyOf(row))} active={isActive(row)} onPick={() => toggle(itemOf(row))} onOpen={() => open(row)} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </Page>
  );
}

function SortHead({ sort, setSort, k, right, children }) {
  const on = sort.key === k;
  const Arrow = sort.desc ? ArrowDown : ArrowUp;
  return (
    <button
      onClick={() => setSort({ key: k, desc: on ? !sort.desc : k === "size" })}
      className={`flex items-center gap-1 py-2 transition-colors hover:text-ink-100 ${right ? "justify-end" : ""} ${on ? "text-ink-300" : ""}`}
    >
      {children}
      {on && <Arrow size={11} />}
    </button>
  );
}

function ListRow({ row, cols, searching, allMode, picked, active, onPick, onOpen }) {
  const e = row.entry;
  const name = row.node ? row.node.name : e.name;
  const sub = row.node ? `${formatCount(row.node.count)} files` : searching ? `${allMode ? `${datasetById(e.ds).title} · ` : ""}${e.path}` : e.title;
  return (
    <div
      onClick={onOpen}
      style={{ height: `${ROW}rem` }}
      className={`group grid cursor-pointer ${cols} items-center rounded-xl text-[0.9rem] transition-colors sm:px-2 ${active ? "bg-ink-800" : "hover:bg-white/[0.03]"}`}
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
      <span className="hidden truncate text-xs text-ink-400 sm:block">{row.node ? "Folder" : e.tag || e.ext || "file"}</span>
      <span className="text-right text-xs text-ink-400 tabular-nums">{formatSize(row.node ? row.node.size : e.size)}</span>
      <span className="hidden justify-end sm:flex">
        {!row.node && (
          <a
            href={fileUrl(datasetById(e.ds), e.path, true)}
            onClick={(ev) => ev.stopPropagation()}
            title="Download"
            aria-label={`Download ${e.name}`}
            className="flex h-7 w-7 items-center justify-center rounded-lg text-ink-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-ink-700 hover:text-ink-100"
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
      style={{ height: `${CELL}rem` }}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border transition-colors ${active ? "border-white/30 bg-ink-900" : "border-white/[0.06] bg-ink-900 hover:border-white/[0.14]"}`}
    >
      <div className={`flex min-h-0 flex-1 items-center justify-center ${thumb ? "checker" : ""}`}>
        {thumb ? <img src={thumb} loading="lazy" decoding="async" alt="" className="max-h-full max-w-full object-contain p-2" /> : <EntryIcon entry={e} dir={!!row.node} size={30} />}
      </div>
      <div className="shrink-0 border-t border-white/[0.05] px-2.5 py-2 leading-tight">
        <div className="truncate text-xs">{row.node ? row.node.name : e.title || e.name}</div>
        <div className="truncate text-[11px] text-ink-400">{row.node ? `${formatCount(row.node.count)} files` : formatSize(e.size)}</div>
      </div>
      <div className={`absolute top-1.5 left-1.5 ${picked ? "" : "md:opacity-0 md:group-hover:opacity-100"}`}>
        <Check picked={picked} onClick={onPick} boxed />
      </div>
    </div>
  );
}
