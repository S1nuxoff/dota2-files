import { Crumbs, Dropdown } from "./ui.jsx";
import { ArrowUpRight } from "lucide-react";
import { imageUrl } from "../lib/catalog.js";
// The parts a hero's, a set's and an item's pages share, so the three read alike: where it sits, then
// three columns under the front page's light, over the model standing on the page itself in the
// middle (no frame, the stage spans all three): what it is on the left, its numbers, contents and downloads on the right (on a phone, one
// under the other)

export function DetailTop({ crumbs, stage, left, children }) {
  return (
    <>
      <div className="page-x pt-5 sm:pt-6">
        <Crumbs items={crumbs} />
      </div>
      <section>
        <div className="page-x grid items-center gap-6 pt-4 lg:grid-cols-[minmax(24rem,34rem)_minmax(0,1fr)_minmax(17rem,23rem)] lg:gap-6 lg:pt-0 xl:gap-10">
          {/* on a large screen the stage spans the page, the model in its middle, and the words on the left
              and the side on the right lie over it: the pointer passes through them to the model, but
              for their links and buttons */}
          <div className="relative z-10 flex min-w-0 flex-col gap-5 max-lg:items-center max-lg:text-center lg:pointer-events-none lg:col-start-1 lg:row-start-1 lg:[&_a]:pointer-events-auto lg:[&_button]:pointer-events-auto">{left}</div>
          <div className="relative h-[min(58svh,30rem)] lg:col-span-3 lg:col-start-1 lg:row-start-1 lg:h-[min(80vh,52rem)]">
            {/* the floor the model stands on: a soft light under it, fading into the page */}
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[8%] bottom-[4%] h-[30%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.07),rgba(229,70,46,0.07)_55%,transparent)] blur-xl" />
            <div aria-hidden="true" className="pointer-events-none absolute inset-x-[20%] top-[12%] bottom-[20%] rounded-[50%] bg-[radial-gradient(closest-side,rgba(255,255,255,0.045),transparent)] blur-2xl" />
            {stage}
          </div>
          <aside className="relative z-10 flex min-w-0 flex-col gap-6 lg:pointer-events-none lg:col-start-3 lg:row-start-1 lg:[&_a]:pointer-events-auto lg:[&_button]:pointer-events-auto">{children}</aside>
        </div>
      </section>
    </>
  );
}

// The side's head: an icon, the name, a line of numbers, the words of what it is
export function SideTitle({ icon, title, line, tags }) {
  return (
    <header>
      <div className="flex flex-col gap-3 max-lg:items-center">
        {icon}
        <div className="min-w-0">
          <h1 className="text-[clamp(2.4rem,4.4vw,4.8rem)] leading-[0.96] font-semibold tracking-[-0.05em] text-balance [text-shadow:0_2px_24px_rgb(0_0_0/0.7)]">{title}</h1>
          {line && <p className="mt-2 text-[0.9rem] text-ink-400">{line}</p>}
        </div>
      </div>
      {tags && <div className="mt-4 flex flex-wrap gap-1.5 max-lg:justify-center">{tags}</div>}
    </header>
  );
}

// A block of the side with a small title
export function SideBlock({ title, action, children }) {
  return (
    <div>
      {(title || action) && (
        <div className="mb-2.5 flex items-baseline justify-between gap-3">
          <h2 className="text-[0.8rem] font-medium text-ink-500">{title}</h2>
          {action}
        </div>
      )}
      {children}
    </div>
  );
}

// The downloads: the main one the full width, the others two by two
export function SideActions({ main, children }) {
  return (
    <div className="space-y-2">
      {main && <div className="grid [&>*]:w-full">{main}</div>}
      <div className="grid grid-cols-2 gap-2 [&>*]:w-full">{children}</div>
    </div>
  );
}

// A row of buttons over the stage's bottom, scrolling sideways on a phone
export function StageBar({ children, className = "" }) {
  return <div className={`no-bar absolute inset-x-3 bottom-3 flex justify-center overflow-x-auto sm:inset-x-5 sm:bottom-5 ${className}`}>{children}</div>;
}

// Small switches on a stage or the side (personas, styles): a pill of choices
export function StageSwitch({ items, value, onChange, light = false }) {
  return (
    <div className={`flex shrink-0 flex-wrap gap-1 rounded-full p-1 ${light ? "border border-white/[0.07] bg-ink-900" : "bg-black/45 backdrop-blur-md"}`}>
      {items.map(([id, title, hint]) => (
        <button
          key={id}
          onClick={() => onChange(id)}
          title={hint}
          className={`h-8 shrink-0 rounded-full px-3.5 text-[0.82rem] whitespace-nowrap transition-colors ${id === value ? "bg-ink-100 text-ink-950" : "text-ink-300 hover:text-ink-100"}`}
        >
          {title}
        </button>
      ))}
    </div>
  );
}

// A word on what something is: its rarity, slot, year; a link when it leads somewhere
export function Tag({ href, color, children }) {
  const cls = "inline-flex h-7 items-center rounded-full border border-white/[0.07] bg-white/[0.03] px-3 text-[0.8rem]";
  return href ? (
    <a href={href} className={`${cls} text-ink-100 transition-colors hover:border-white/[0.18]`}>
      {children}
    </a>
  ) : (
    <span className={`${cls} text-ink-300`} style={color ? { color } : undefined}>
      {children}
    </span>
  );
}

// Small icons of the things it holds (a set's items, a chest's drops), each opening its own
export function IconRow({ items, rarities, onOpen, limit = 10 }) {
  return (
    <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-8 lg:grid-cols-5">
      {items.slice(0, limit).map((item) => (
        <button
          key={item.id}
          onClick={() => onOpen(item.id)}
          title={item.name}
          className="relative aspect-[4/3] overflow-hidden rounded-lg border border-white/[0.06] bg-ink-850 transition-colors hover:border-white/25"
        >
          {item.icon && <img src={imageUrl(item.icon)} alt={item.name} loading="lazy" className="h-full w-full object-cover" />}
          {rarities?.[item.rarity || "common"]?.color && <span className="absolute inset-x-0 bottom-0 h-[2px]" style={{ background: rarities[item.rarity || "common"].color }} />}
        </button>
      ))}
    </div>
  );
}

// The styles of an item (its models), to pick one on the stage: a few as a pill of choices at the
// bottom's middle, many (a courier's levels) as a list in the bottom right corner, clear of the
// animations list in the left one. Names without the file's ending and underscores
export function StyleSwitch({ models, value, onChange }) {
  const name = (m) => m.name.replace(/\.glb$/, "").replace(/_/g, " ");
  if (models.length <= 3) {
    return (
      <StageBar className="pointer-events-none [&>*]:pointer-events-auto">
        <StageSwitch items={models.map((m, i) => [i, name(m), m.name])} value={value} onChange={onChange} />
      </StageBar>
    );
  }
  return (
    <div className="absolute right-3 bottom-3 z-10 sm:right-4 sm:bottom-4">
      <Dropdown
        up
        value={value}
        onChange={onChange}
        label="Style"
        options={models.map((m, i) => [i, name(m)])}
        buttonClass="flex h-9 max-w-[15rem] min-w-[10rem] items-center gap-2 rounded-full bg-black/45 pr-3 pl-4 text-[0.82rem] text-ink-100 capitalize backdrop-blur-md transition-colors hover:bg-black/65"
      />
    </div>
  );
}

// The way to Dotadex from a hero, set or item: what it shows there, and the code to put it on another
// site (embed) beside it
export function DotadexCard({ href, name, embed }) {
  return (
    <div className="flex items-stretch overflow-hidden rounded-2xl border border-white/[0.08] bg-[linear-gradient(120deg,rgba(229,70,46,0.10),transparent_55%)]">
      <a href={href} target="_blank" rel="noreferrer" className="group flex min-w-0 flex-1 items-center gap-3.5 p-3.5 transition-colors hover:bg-white/[0.03]">
        <span className="min-w-0 flex-1 leading-tight">
          <span className="flex items-center gap-1.5 text-[0.92rem] font-medium">
            See {name} in Dotadex <ArrowUpRight size={15} className="text-ink-400 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          <span className="mt-1 block text-[0.8rem] text-ink-400">The game's own shading, effects and voice lines</span>
        </span>
      </a>
      {embed && <div className="flex items-center border-l border-white/[0.06] px-1.5">{embed}</div>}
    </div>
  );
}
