import { House, Search } from "lucide-react";
import { DATASETS } from "../datasets.js";
import { formatCount } from "../lib/format.js";

export default function Sidebar({ route, indexes }) {
  const item = (active) =>
    `flex h-9 items-center gap-3 rounded-md px-3 text-sm transition ${active ? "bg-ink-850 text-ink-100" : "text-ink-300 hover:bg-ink-900 hover:text-ink-100"}`;
  return (
    <nav className="flex w-56 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-ink-800 p-3">
      <a href="#/" className={item(!route.ds)}>
        <House size={16} strokeWidth={1.75} />
        Overview
      </a>
      {route.ds === "all" && (
        <span className={item(true)}>
          <Search size={16} strokeWidth={1.75} />
          All datasets
        </span>
      )}
      <div className="mt-4 mb-1.5 px-3 text-[11px] font-medium tracking-wider text-ink-400 uppercase">Datasets</div>
      {DATASETS.map((ds) => {
        const Icon = ds.icon;
        const index = indexes[ds.id];
        return (
          <a key={ds.id} href={`#/${ds.id}`} className={item(route.ds === ds.id)}>
            <Icon size={16} strokeWidth={1.75} className={route.ds === ds.id ? "text-accent" : ""} />
            <span className="flex-1">{ds.title}</span>
            <span className="text-[11px] text-ink-400 tabular-nums">{index ? formatCount(index.count) : ""}</span>
          </a>
        );
      })}
      <div className="flex-1" />
      <p className="px-3 pt-6 text-[11px] leading-relaxed text-ink-400">
        Dota 2 content and materials are trademarks and copyrights of Valve. Not affiliated with Valve. Non-commercial.
      </p>
    </nav>
  );
}
