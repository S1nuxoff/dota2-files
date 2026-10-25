import { Crumbs } from "./ui.jsx";
import { imageUrl } from "../lib/catalog.js";
// The parts a hero's, a set's and an item's pages share, so the three read alike: where it sits, then
// two columns, as a product's page: the stage on the left, on the right what it is and its downloads
// (on a phone, one under the other)

export function DetailTop({ crumbs, stage, children }) {
  return (
    <>
      <div className="page-x pt-5 sm:pt-6">
        <Crumbs items={crumbs} />
      </div>
      <section className="page-x mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:gap-8 xl:gap-12">
        <div className="stage relative h-[min(60svh,32rem)] overflow-hidden rounded-2xl border border-white/[0.06] sm:rounded-3xl lg:h-[min(74vh,44rem)]">
          {stage}
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
        </div>
        <aside className="flex min-w-0 flex-col gap-6 lg:py-2">{children}</aside>
      </section>
    </>
  );
}

// The side's head: an icon, the name, a line of numbers, the words of what it is
export function SideTitle({ icon, title, line, tags }) {
  return (
    <header>
      <div className="flex items-start gap-3.5">
        {icon}
        <div className="min-w-0">
          <h1 className="text-[clamp(1.9rem,3.2vw,2.75rem)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance">{title}</h1>
          {line && <p className="mt-2 text-[0.9rem] text-ink-400">{line}</p>}
        </div>
      </div>
      {tags && <div className="mt-4 flex flex-wrap gap-1.5">{tags}</div>}
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
