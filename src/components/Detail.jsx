import { Crumbs } from "./ui.jsx";
// The parts a hero's, a set's and an item's pages share, so the three read alike: where it sits,
// a large stage, its name with what it is beside its downloads

// The stage the hero or the item stands on: tall on a large screen, most of a phone's screen
export function Stage({ children, className = "" }) {
  return (
    <div className="page-x mt-4">
      <div className={`stage relative h-[min(62svh,34rem)] overflow-hidden rounded-2xl border border-white/[0.06] sm:h-[min(70vh,48rem)] sm:rounded-3xl ${className}`}>
        {children}
        <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      </div>
    </div>
  );
}

// A row of buttons over the stage's bottom, scrolling sideways on a phone
export function StageBar({ children, className = "" }) {
  return <div className={`no-bar absolute inset-x-3 bottom-3 flex justify-center overflow-x-auto sm:inset-x-5 sm:bottom-5 ${className}`}>{children}</div>;
}

// Small switches on a stage (personas, styles, sizes): a dark glass pill
export function StageSwitch({ items, value, onChange }) {
  return (
    <div className="flex shrink-0 gap-1 rounded-full bg-black/45 p-1 backdrop-blur-md">
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

// Under the stage: its name, what it is, a line of numbers; its downloads on the right (on a phone,
// under it, the main one the full width)
export function DetailHead({ crumbs, icon, title, tags, line, actions, children }) {
  return (
    <>
      {crumbs && (
        <div className="page-x pt-5 sm:pt-6">
          <Crumbs items={crumbs} />
        </div>
      )}
      {children}
      <header className="page-x mt-6 flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between lg:gap-10">
        <div className="flex min-w-0 items-start gap-4">
          {icon}
          <div className="min-w-0">
            <h1 className="text-[clamp(1.9rem,4vw,3rem)] leading-[1.04] font-semibold tracking-[-0.04em] text-balance">{title}</h1>
            {line && <p className="mt-2 text-[0.92rem] text-ink-400">{line}</p>}
            {tags && <div className="mt-3.5 flex flex-wrap gap-1.5">{tags}</div>}
          </div>
        </div>
        {actions && <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap lg:shrink-0 lg:justify-end max-sm:[&>*:first-child]:col-span-2">{actions}</div>}
      </header>
    </>
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
