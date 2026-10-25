import { useMemo, useState } from "react";
import { ChevronDown, FileArchive, Search } from "lucide-react";
import { filesOfRefs, imageUrl } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { link, openItem } from "../lib/route.js";
import SoundList from "./SoundList.jsx";
import { PageHead, SearchField, Spinner } from "./ui.jsx";

// Every music pack of the game, the latest first, each opening to its tracks to play in place
export default function MusicPage({ catalog, indexes, withCopies, route }) {
  const [filter, setFilter] = useState("");
  const [open, setOpen] = useState("");
  const packs = useMemo(
    () =>
      catalog
        ? Object.values(catalog.items)
            .filter((i) => i.prefab === "music")
            .sort((a, b) => (b.date || "").localeCompare(a.date || "") || a.name.localeCompare(b.name))
        : [],
    [catalog]
  );
  if (!catalog) return <Spinner text="Loading the catalog" />;
  const words = filter.toLowerCase().split(/\s+/).filter(Boolean);
  const shown = packs.filter((p) => words.every((w) => p.name.toLowerCase().includes(w)));

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="anim-page">
        <PageHead title="Music" sub={`${packs.length} music packs of Dota 2, every track to play here and download.`}>
          <SearchField value={filter} onChange={setFilter} icon={Search} placeholder="Search by pack" />
        </PageHead>
        <div className="mx-auto max-w-[100rem] space-y-3 px-8 pb-20">
          {shown.map((p, i) => (
            <Pack key={p.id} pack={p} catalog={catalog} indexes={indexes} withCopies={withCopies} route={route} open={open === p.id} onToggle={() => setOpen(open === p.id ? "" : p.id)} delay={Math.min(i, 20) * 20} />
          ))}
          {shown.length === 0 && <p className="py-16 text-center text-ink-400">No pack has that name.</p>}
        </div>
      </div>
    </div>
  );
}

function Pack({ pack, catalog, indexes, withCopies, route, open, onToggle, delay }) {
  const tracks = useMemo(() => [...filesOfRefs({ sounds: pack.refs.sounds || [] }, indexes, withCopies).values()], [pack, indexes, withCopies]);
  const bytes = tracks.reduce((n, e) => n + e.size, 0);
  const event = pack.event && catalog.events?.[pack.event];
  return (
    <div className="anim-card overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center gap-5 p-3 pr-5">
        <button onClick={onToggle} className="flex min-w-0 flex-1 items-center gap-5 text-left">
          <div className="h-20 w-28 shrink-0 overflow-hidden rounded-xl bg-ink-850">{pack.icon && <img src={imageUrl(pack.icon)} alt="" loading="lazy" className="h-full w-full object-cover" />}</div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[1.02rem] font-medium">{pack.name}</div>
            <div className="mt-1.5 text-[0.84rem] text-ink-400">{[pack.date?.slice(0, 4), event, `${formatCount(tracks.length)} tracks`].filter(Boolean).join("   ")}</div>
          </div>
          <ChevronDown size={18} className={`shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        <a
          href={link(`/item/${pack.id}`)}
          onClick={(e) => {
            if (e.metaKey || e.ctrlKey || e.button !== 0) return;
            e.preventDefault();
            openItem(pack.id);
          }}
          className="rounded-lg px-3 py-2 text-[0.86rem] text-ink-300 transition-colors hover:bg-ink-850 hover:text-ink-100"
        >
          Details
        </a>
        <button
          onClick={() => startJob("zip", tracks.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: e.path.split("/").pop() })), pack.name.replace(/[\/:*?"<>|]/g, ""))}
          disabled={!tracks.length}
          className="flex h-10 items-center gap-2 rounded-lg bg-ink-100 px-4 text-[0.88rem] font-medium text-ink-950 transition-colors hover:bg-white disabled:opacity-40"
        >
          <FileArchive size={16} /> Download <span className="font-normal opacity-55">{formatSize(bytes)}</span>
        </button>
      </div>
      {open && (
        <div className="anim-fade border-t border-white/[0.06] p-5">
          <SoundList files={tracks} route={route} />
        </div>
      )}
    </div>
  );
}
