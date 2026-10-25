import { useMemo, useState } from "react";
import { fuzzyMatch } from "../lib/smart.js";
import { ChevronDown, FileArchive } from "lucide-react";
import { filesOfRefs, imageUrl } from "../lib/catalog.js";
import { formatCount, formatSize } from "../lib/format.js";
import { startJob } from "../lib/jobs.js";
import { link, openItem } from "../lib/route.js";
import SoundList from "./SoundList.jsx";
import { Button, Empty, Page, PageHead, SearchField, Spinner, Toolbar, LoadingList } from "./ui.jsx";
import { CosmeticsTabs } from "./CosmeticsPage.jsx";

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
  if (!catalog) return <LoadingList title="Music" grid="space-y-3" ratio="h-20" count={6} tabs={<CosmeticsTabs current="/music" />} />;
  const match = fuzzyMatch(packs, (p) => p.name, filter);
  const shown = packs.filter((p) => !match || match.has(p));

  return (
    <Page>
      <PageHead eyebrow={`${packs.length} music packs`} title="Music" sub="Every music pack of Dota 2, the latest first. Open one to play its tracks here, or take the whole pack at once."
        search={<SearchField big value={filter} onChange={setFilter} placeholder="Search by pack" />}
      >
        <CosmeticsTabs current="/music" />
      </PageHead>
      <div className="page-x space-y-3 pt-4">
        {shown.map((p, i) => (
          <Pack key={p.id} pack={p} catalog={catalog} indexes={indexes} withCopies={withCopies} route={route} open={open === p.id} onToggle={() => setOpen(open === p.id ? "" : p.id)} delay={Math.min(i, 20) * 20} />
        ))}
        {shown.length === 0 && <Empty title="No pack has that name" />}
      </div>
    </Page>
  );
}

function Pack({ pack, catalog, indexes, withCopies, route, open, onToggle, delay }) {
  const tracks = useMemo(() => [...filesOfRefs({ sounds: pack.refs.sounds || [] }, indexes, withCopies).values()], [pack, indexes, withCopies]);
  const bytes = tracks.reduce((n, e) => n + e.size, 0);
  const event = pack.event && catalog.events?.[pack.event];
  return (
    <div className={`anim-card overflow-hidden rounded-2xl border bg-ink-900 transition-colors ${open ? "border-white/[0.14]" : "border-white/[0.06] hover:border-white/[0.11]"}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="flex flex-wrap items-center gap-3 p-3 sm:flex-nowrap sm:gap-5 sm:pr-4">
        <button onClick={onToggle} aria-expanded={open} className="flex min-w-0 flex-1 items-center gap-4 text-left sm:gap-5">
          <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl bg-ink-850 sm:h-20 sm:w-28">
            {pack.icon && <img src={imageUrl(pack.icon)} alt="" loading="lazy" className="h-full w-full object-cover" />}
            {open && (
              <span aria-hidden="true" className="absolute inset-0 flex items-end justify-center gap-[3px] bg-black/45 pb-3">
                {[0, 1, 2, 3].map((n) => (
                  <span key={n} className="h-5 w-[3px] origin-bottom rounded-full bg-ink-100" style={{ animation: `bar ${0.7 + n * 0.17}s ease-in-out ${n * -0.2}s infinite` }} />
                ))}
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="truncate text-[0.98rem] font-medium sm:text-[1.02rem]">{pack.name}</div>
            <div className="mt-1.5 truncate text-[0.82rem] text-ink-400">{[pack.date?.slice(0, 4), event, `${formatCount(tracks.length)} tracks`].filter(Boolean).join(" · ")}</div>
          </div>
          <ChevronDown size={18} className={`shrink-0 text-ink-400 transition-transform duration-300 ${open ? "rotate-180" : ""}`} />
        </button>
        <div className="flex w-full gap-2 sm:w-auto">
          <Button
            as="a"
            ghost
            href={link(`/item/${pack.id}`)}
            onClick={(e) => {
              if (e.metaKey || e.ctrlKey || e.button !== 0) return;
              e.preventDefault();
              openItem(pack.id);
            }}
            className="max-sm:flex-1"
          >
            Details
          </Button>
          <Button
            primary
            onClick={() => startJob("zip", tracks.map((e) => ({ ds: e.ds, path: e.path, size: e.size, name: e.path.split("/").pop() })), pack.name.replace(/[\\/:*?"<>|]/g, ""))}
            disabled={!tracks.length}
            className="max-sm:flex-1"
          >
            <FileArchive size={16} /> Download <span className="font-normal opacity-55">{formatSize(bytes)}</span>
          </Button>
        </div>
      </div>
      {open && (
        <div className="anim-fade border-t border-white/[0.06] p-3 sm:p-5">
          <SoundList files={tracks} route={route} />
        </div>
      )}
    </div>
  );
}
