import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, Search, X } from "lucide-react";
import { link } from "../lib/route.js";
// The pieces every page is built of, so they look one: a page's head, its sticky bar of filters,
// chips, tabs, buttons, cards, windows

// A page under the site's bar
export function Page({ children, className = "" }) {
  return <div className={`pt-14 ${className}`}>{children}</div>;
}

// Where a page sits: Heroes / Pudge. items: [[path, title]], the last one the page itself
export function Crumbs({ items, className = "" }) {
  return (
    <nav aria-label="Breadcrumb" className={`no-bar -mx-1 overflow-x-auto ${className}`}>
      <ol className="flex items-center gap-0.5 text-[0.86rem] whitespace-nowrap">
        {items.map(([path, title], i) => {
          const last = i === items.length - 1;
          return (
            <li key={path || i} className="flex items-center gap-0.5">
              {i > 0 && <ChevronRight size={14} className="text-ink-600" aria-hidden="true" />}
              {last || !path ? (
                <span aria-current={last ? "page" : undefined} className={`px-1 ${last ? "text-ink-200" : "text-ink-400"}`}>
                  {title}
                </span>
              ) : (
                <a href={link(path)} className="rounded-md px-1 text-ink-400 transition-colors hover:text-ink-100">
                  {title}
                </a>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

// A page's head, in the middle: where it sits, the title, a line under it, then what
// to do with the whole of it (a search, tabs) under them
export function PageHead({ crumbs, title, sub, search, actions, children, className = "" }) {
  return (
    <header className={`page-x flex flex-col items-center pt-8 pb-6 text-center sm:pt-14 sm:pb-8 ${className}`}>
      {crumbs && <Crumbs items={crumbs} className="mb-6 [&>ol]:justify-center" />}
      <h1 className="max-w-4xl text-[clamp(2.1rem,4.6vw,3.6rem)] leading-[1.02] font-semibold tracking-[-0.045em] text-balance">{title}</h1>
      {sub && <p className="mt-4 max-w-2xl text-[1rem] leading-relaxed text-balance text-ink-400">{sub}</p>}
      {search && <div className="mt-8 w-full max-w-2xl [&>label]:h-14 [&>label]:rounded-2xl [&>label]:pl-5 [&>label]:shadow-[0_24px_60px_-28px_rgb(0_0_0/0.9)]">{search}</div>}
      {actions && <div className="mt-6 flex flex-wrap justify-center gap-2">{actions}</div>}
      {children}
    </header>
  );
}

// Is the element scrolled past the top bar: a sticky bar takes its own background from then on
function useStuck(offset = 57) {
  const ref = useRef(null);
  const [stuck, setStuck] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setStuck(!e.isIntersecting && e.boundingClientRect.top < offset), { rootMargin: `-${offset}px 0px 0px 0px` });
    io.observe(el);
    return () => io.disconnect();
  }, [offset]);
  return [ref, stuck];
}

// A page's search and filters, sticking under the site's bar as the page scrolls, where they are
// wanted most: deep in a long list
export function Toolbar({ children, className = "", below }) {
  const [sentinel, stuck] = useStuck();
  return (
    <>
      <div ref={sentinel} aria-hidden="true" className="h-px" />
      <div
        className={`sticky top-14 z-20 border-b transition-[background-color,border-color] duration-300 ${
          stuck ? "border-white/[0.06] bg-ink-950/85 backdrop-blur-xl" : "border-transparent"
        }`}
      >
        <div className={`page-x flex flex-wrap items-center justify-center gap-2 py-3 ${className}`}>{children}</div>
        {below}
      </div>
    </>
  );
}

// A search field of a page: what it filters is said in its placeholder; Esc or the cross clears it
export function SearchField({ value, onChange, placeholder, icon: Icon = Search, right, onEnter, onFocus, big = false, className = "", inputRef }) {
  return (
    <label
      className={`group flex w-full min-w-0 items-center gap-2.5 rounded-xl border border-white/[0.08] bg-ink-900 pr-1.5 pl-3.5 transition-colors focus-within:border-white/20 focus-within:bg-ink-850 hover:border-white/[0.12] ${
        big ? "h-12" : "h-10"
      } ${className}`}
    >
      <Icon size={big ? 18 : 16} className="shrink-0 text-ink-400 transition-colors group-focus-within:text-ink-200" />
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onKeyDown={(e) => {
          if (e.key === "Enter") onEnter?.();
          if (e.key === "Escape" && value) (e.stopPropagation(), onChange(""));
        }}
        placeholder={placeholder}
        enterKeyHint="search"
        className={`h-full min-w-0 flex-1 bg-transparent outline-none placeholder:text-ink-500 ${big ? "text-[1rem]" : "text-[0.92rem]"}`}
      />
      {value && (
        <button onClick={() => onChange("")} aria-label="Clear" className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100">
          <X size={15} />
        </button>
      )}
      {right}
    </label>
  );
}

export function Chip({ active, children, className = "", ...props }) {
  return (
    <button
      {...props}
      aria-pressed={active}
      className={`inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-[0.86rem] whitespace-nowrap transition-colors ${
        active ? "border-transparent bg-ink-100 text-ink-950" : "border-white/[0.07] bg-white/[0.03] text-ink-300 hover:border-white/[0.14] hover:text-ink-100"
      } ${className}`}
    >
      {children}
    </button>
  );
}

const BUTTON_SIZES = { sm: "h-8 px-3 text-[0.84rem] rounded-lg gap-1.5", md: "h-10 px-4 text-[0.9rem] rounded-xl gap-2", lg: "h-12 px-5 text-[0.95rem] rounded-xl gap-2" };

// primary: the one thing a page is for (white); ghost: a quiet one on a busy place; else a surface
export function buttonClass({ primary, ghost, size = "md" } = {}) {
  const look = primary
    ? "bg-ink-100 text-ink-950 hover:bg-white shadow-[0_1px_0_rgb(255_255_255/0.4)_inset,0_8px_24px_-12px_rgb(255_255_255/0.35)]"
    : ghost
      ? "text-ink-200 hover:bg-white/[0.07] hover:text-ink-100"
      : "border border-white/[0.08] bg-ink-850 text-ink-100 hover:border-white/[0.14] hover:bg-ink-800";
  return `inline-flex items-center justify-center font-medium whitespace-nowrap transition-[background-color,border-color,color,transform] active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40 ${BUTTON_SIZES[size]} ${look}`;
}

export function Button({ primary, ghost, size = "md", children, className = "", as: Tag = "button", ...props }) {
  return (
    <Tag {...props} className={`${buttonClass({ primary, ghost, size })} ${className}`}>
      {children}
    </Tag>
  );
}

// A card: a picture on a soft stage, its name and a line under it. It lifts a little under the
// pointer; badge on the picture's corner, action on the other (shown on hover where there is one)
export function Card({ href, onClick, picture, ratio = "aspect-[4/3.4]", badge, action, title, meta, className = "", style }) {
  const Tag = href ? "a" : "div";
  return (
    <Tag
      href={href}
      onClick={onClick}
      style={style}
      className={`group relative flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-900 transition-[border-color,transform,box-shadow] duration-300 ease-[var(--ease-out-soft)] hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_18px_40px_-24px_rgb(0_0_0/0.9)] ${className}`}
    >
      <div className={`stage relative ${ratio} overflow-hidden`}>
        {picture}
        {badge && <span className="absolute top-2.5 left-2.5 rounded-md bg-black/55 px-2 py-1 text-[0.72rem] text-ink-100 backdrop-blur">{badge}</span>}
        {action && <span className="absolute top-2.5 right-2.5 transition-opacity md:opacity-0 md:group-hover:opacity-100">{action}</span>}
      </div>
      <div className="px-3.5 pt-2.5 pb-3 leading-tight sm:px-4 sm:pt-3 sm:pb-3.5">
        <div className="truncate text-[0.92rem] font-medium sm:text-[0.95rem]">{title}</div>
        {meta && <div className="mt-1 truncate text-[0.8rem] text-ink-400">{meta}</div>}
      </div>
    </Tag>
  );
}

// The grid cards stand in: as many columns as fit, two at the least on a phone
export const GRID = {
  tall: "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(11rem,1fr))] sm:gap-4",
  item: "grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fill,minmax(12rem,1fr))] sm:gap-4",
  tile: "grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-[repeat(auto-fill,minmax(16rem,1fr))] sm:gap-4",
  small: "grid grid-cols-3 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]",
};

export function Spinner({ text }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 py-24 text-[0.92rem] text-ink-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-600 border-t-ink-100" /> {text}
    </div>
  );
}

// Nothing to show: what happened, and a way on
export function Empty({ title, text, action }) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      <div className="text-[1.05rem] font-medium">{title}</div>
      {text && <p className="mt-2 max-w-sm text-[0.9rem] text-ink-400">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

// A section of a page: its title, how many, a line under it, what to do with it on the right
export function Section({ id, title, count, sub, actions, children, center = false, className = "" }) {
  if (center)
    return (
      <section id={id} className={`scroll-mt-28 ${className}`}>
        <div className="mb-7 flex flex-col items-center text-center">
          <h2 className="text-[clamp(1.4rem,2.2vw,1.9rem)] font-semibold tracking-[-0.035em]">{title}</h2>
          {sub && <p className="mt-2 max-w-xl text-[0.92rem] text-balance text-ink-400">{sub}</p>}
          {actions && <div className="mt-4">{actions}</div>}
        </div>
        {children}
      </section>
    );
  return (
    <section id={id} className={className}>
      <div className="mb-5 flex flex-wrap items-end gap-x-4 gap-y-2">
        <div className="min-w-0 flex-1">
          <h2 className="flex items-baseline gap-2.5 text-[1.2rem] font-semibold tracking-[-0.025em] sm:text-[1.3rem]">
            {title}
            {count != null && <span className="text-[0.9rem] font-normal text-ink-400 tabular-nums">{typeof count === "number" ? count.toLocaleString("en-US") : count}</span>}
          </h2>
          {sub && <p className="mt-1 text-[0.88rem] text-ink-400">{sub}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

// One of a few, with a light that slides to the picked one: a page's tabs (line) or a switch (pill).
// items: [[id, title, count?, href?]] (with href, links to pages). On a phone the row scrolls sideways, the picked one kept in view
export function Segmented({ items, value, onChange, variant = "pill", className = "", label }) {
  const row = useRef(null);
  const [mark, setMark] = useState(null);
  const place = useCallback(() => {
    const el = row.current?.querySelector('[aria-selected="true"]');
    if (el) setMark({ left: el.offsetLeft, width: el.offsetWidth });
  }, []);
  useLayoutEffect(place, [value, items.length, place]);
  useEffect(() => {
    const ro = new ResizeObserver(place);
    if (row.current) ro.observe(row.current);
    return () => ro.disconnect();
  }, [place]);
  useEffect(() => {
    row.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [value]);
  const line = variant === "line";
  return (
    <div
      ref={row}
      role="tablist"
      aria-label={label}
      className={`no-bar relative flex max-w-full overflow-x-auto ${line ? "gap-1 border-b border-white/[0.07]" : "gap-0.5 rounded-xl border border-white/[0.06] bg-ink-900 p-1"} ${className}`}
    >
      {mark && (
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute transition-[left,width] duration-300 ease-[var(--ease-out-soft)] ${line ? "bottom-0 h-[2px] rounded-full bg-ink-100" : "top-1 bottom-1 rounded-lg bg-ink-700/80 shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]"}`}
          style={{ left: mark.left, width: mark.width }}
        />
      )}
      {items.map(([id, title, count, href]) => {
        const on = id === value;
        const Tag = href ? "a" : "button";
        return (
          <Tag
            key={id}
            href={href}
            role="tab"
            aria-selected={on}
            onClick={href ? undefined : () => onChange(id)}
            className={`relative z-10 flex shrink-0 items-center gap-1.5 whitespace-nowrap transition-colors ${
              line ? `h-11 px-3 text-[0.92rem] ${on ? "text-ink-100" : "text-ink-400 hover:text-ink-200"}` : `h-8 rounded-lg px-3 text-[0.85rem] ${on ? "text-ink-100" : "text-ink-400 hover:text-ink-200"}`
            }`}
          >
            {title}
            {count != null && <span className="text-[0.8em] text-ink-500 tabular-nums">{count.toLocaleString("en-US")}</span>}
          </Tag>
        );
      })}
    </div>
  );
}

// A list to pick one of, in the site's own panel (the browser's own list does not match it);
// up: it opens above (at the foot of a stage); a long one scrolls
export function Dropdown({ value, onChange, options, className = "", up = false, left = false, buttonClass = "", label }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => !box.current?.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);
  const current = options.find(([v]) => v === value)?.[1] ?? options[0]?.[1];
  return (
    <div ref={box} className={`${/(absolute|fixed)/.test(className) ? "" : "relative"} ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        aria-label={label}
        className={
          buttonClass ||
          "flex h-10 w-full items-center gap-2 rounded-xl border border-white/[0.08] bg-ink-900 pr-3 pl-3.5 text-[0.88rem] text-ink-100 transition-colors hover:border-white/[0.14] sm:min-w-[9.5rem]"
        }
      >
        <span className="flex-1 truncate text-left">{current}</span>
        <ChevronDown size={15} className={`shrink-0 text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`anim-open absolute z-40 max-h-80 min-w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-ink-900/95 p-1.5 shadow-2xl shadow-black/60 backdrop-blur-xl ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          } ${left ? "left-0" : "right-0"}`}
        >
          {options.map(([v, title]) => (
            <button
              key={v}
              onClick={() => {
                onChange(v);
                setOpen(false);
              }}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-[0.88rem] whitespace-nowrap transition-colors ${v === value ? "bg-ink-800 text-ink-100" : "text-ink-300 hover:bg-ink-850 hover:text-ink-100"}`}
            >
              <span className="flex-1">{title}</span>
              {v === value && <Check size={15} />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// A window over the page for a few choices: a sheet rising from the bottom on a phone, a panel from
// the right on a larger screen. Esc, a click outside or the cross close it
export function Sheet({ title, onClose, children, footer }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div data-lock className="anim-fade fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px]" onClick={onClose} role="dialog" aria-modal="true" aria-label={title}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="max-md:anim-sheet md:anim-open absolute flex flex-col overflow-hidden border-white/[0.08] bg-ink-900 shadow-2xl shadow-black/70 max-md:inset-x-0 max-md:bottom-0 max-md:max-h-[88dvh] max-md:rounded-t-3xl max-md:border-t md:top-3 md:right-3 md:bottom-3 md:w-[26rem] md:rounded-2xl md:border"
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-ink-600 md:hidden" aria-hidden="true" />
        <div className="flex items-center justify-between px-5 pt-3 pb-2 md:pt-5">
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.02em]">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="flex h-9 w-9 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-ink-800 hover:text-ink-100">
            <X size={18} />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-6">{children}</div>
        {footer && <div className="border-t border-white/[0.06] px-5 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>}
      </div>
    </div>
  );
}

// More of a long list as its end comes near: a mark to put after the list
export function useMore(more, active) {
  const ref = useRef(null);
  const latest = useRef(more);
  latest.current = more;
  useEffect(() => {
    const el = ref.current;
    if (!el || !active) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && latest.current(), { rootMargin: "0px 0px 900px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [active]);
  return ref;
}

// Blocks with data-reveal show as they scroll into view, anywhere on the site
export function useReveal() {
  useEffect(() => {
    const seen = new IntersectionObserver(
      (list) => {
        for (const e of list) if (e.isIntersecting) (e.target.classList.add("is-shown"), seen.unobserve(e.target));
      },
      { rootMargin: "0px 0px -8% 0px" }
    );
    const watch = () => document.querySelectorAll("[data-reveal]:not(.is-shown)").forEach((el) => seen.observe(el));
    watch();
    const later = new MutationObserver(watch);
    later.observe(document.getElementById("root"), { childList: true, subtree: true });
    return () => {
      seen.disconnect();
      later.disconnect();
    };
  }, []);
}

// A list page while its data comes: its head as it will be, the bar of filters, and cards waiting in
// the grid, so nothing jumps when the cards arrive (and the footer stays out of sight)
export function LoadingList({ title, sub, ratio = "aspect-[4/3.4]", grid = GRID.item, count = 18, tabs }) {
  return (
    <Page className="min-h-[100svh]">
      <PageHead title={title} sub={sub}>
        {tabs}
      </PageHead>
      <div className="page-x flex justify-center gap-2 py-3" aria-hidden="true">
        <div className="skeleton h-10 w-full rounded-xl sm:w-72" />
        <div className="skeleton hidden h-10 w-40 rounded-xl sm:block" />
      </div>
      <div className={`page-x pt-4 ${grid}`} aria-busy="true" aria-label="Loading">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border border-white/[0.05]" style={{ animationDelay: `${i * 40}ms` }}>
            <div className={`skeleton ${ratio}`} style={{ animationDelay: `${(i % 6) * 90}ms` }} />
            <div className="space-y-2 px-4 py-3.5">
              <div className="skeleton h-3 w-3/4 rounded" />
              <div className="skeleton h-2.5 w-1/2 rounded" />
            </div>
          </div>
        ))}
      </div>
    </Page>
  );
}

// A hero's, set's or item's page while its data comes: the trail, the stage and the side beside it
export function LoadingDetail() {
  return (
    <Page className="min-h-[100svh]" aria-busy="true">
      <div className="page-x pt-5 sm:pt-6">
        <div className="skeleton h-3.5 w-40 rounded" />
      </div>
      <div className="page-x mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(24rem,30rem)] lg:gap-8 xl:gap-12">
        <div className="skeleton h-[min(60svh,32rem)] rounded-2xl sm:rounded-3xl lg:h-[min(74vh,44rem)]" />
        <div className="space-y-5 lg:py-2">
          <div className="skeleton h-11 w-3/4 rounded-lg" />
          <div className="skeleton h-3.5 w-1/2 rounded" />
          <div className="space-y-2 pt-2">
            <div className="skeleton h-3 w-full rounded" />
            <div className="skeleton h-3 w-11/12 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
          </div>
          <div className="skeleton h-16 w-full rounded-xl" />
          <div className="skeleton h-12 w-full rounded-xl" />
          <div className="grid grid-cols-2 gap-2">
            <div className="skeleton h-10 rounded-xl" />
            <div className="skeleton h-10 rounded-xl" />
          </div>
        </div>
      </div>
    </Page>
  );
}
