import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
// The pieces every page is built of, so they look one: a section's head, chips, buttons, cards

// A section opens with its title and one line under it, centred, and what to do first (a search)
export function PageHead({ title, sub, children }) {
  return (
    <header className="mx-auto flex max-w-3xl flex-col items-center px-8 pt-14 pb-10 text-center">
      <h1 className="text-[2.6rem] leading-[1.05] font-semibold tracking-[-0.035em]">{title}</h1>
      {sub && <p className="mt-3 max-w-xl text-[1.02rem] text-ink-400">{sub}</p>}
      {children && <div className="mt-8 flex w-full flex-col items-center gap-5">{children}</div>}
    </header>
  );
}

// The big search field of a section
export function SearchField({ value, onChange, placeholder, icon: Icon, right, onEnter }) {
  return (
    <label className="flex h-12 w-full max-w-2xl items-center gap-3 rounded-xl border border-white/[0.08] bg-ink-900 pr-2 pl-4 transition-colors focus-within:border-white/20">
      {Icon && <Icon size={18} className="shrink-0 text-ink-400" />}
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onEnter?.()}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[0.98rem] outline-none placeholder:text-ink-400"
      />
      {right}
    </label>
  );
}

export function Chip({ active, children, className = "", ...props }) {
  return (
    <button
      {...props}
      className={`h-9 rounded-full px-4 text-[0.88rem] whitespace-nowrap transition-colors ${active ? "bg-ink-100 text-ink-950" : "bg-ink-800 text-ink-300 hover:bg-ink-700 hover:text-ink-100"} ${className}`}
    >
      {children}
    </button>
  );
}

export function Button({ primary, children, className = "", as: Tag = "button", ...props }) {
  return (
    <Tag
      {...props}
      className={`inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-[0.9rem] font-medium whitespace-nowrap transition-colors ${
        primary ? "bg-ink-100 text-ink-950 hover:bg-white" : "border border-white/[0.08] bg-ink-850 text-ink-100 hover:bg-ink-800"
      } ${className}`}
    >
      {children}
    </Tag>
  );
}

// A card: a picture on a soft grey stage, its name and a line under it inside the card
export function Card({ href, onClick, picture, ratio = "aspect-[4/3.4]", badge, action, title, meta, className = "", style }) {
  const Tag = href ? "a" : "div";
  return (
    <Tag
      href={href}
      onClick={onClick}
      style={style}
      className={`group flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-white/[0.06] bg-ink-850 transition-colors hover:border-white/[0.14] ${className}`}
    >
      <div className={`relative ${ratio} overflow-hidden bg-[radial-gradient(circle_at_50%_45%,#26262a_0%,#18181b_72%)]`}>
        {picture}
        {badge && <span className="absolute top-3 left-3 rounded-md bg-black/50 px-2 py-1 text-[0.72rem] text-ink-100 backdrop-blur">{badge}</span>}
        {action && <span className="absolute top-3 right-3 opacity-0 transition-opacity group-hover:opacity-100">{action}</span>}
      </div>
      <div className="px-4 pt-3 pb-3.5 leading-tight">
        <div className="truncate text-[0.95rem] font-medium">{title}</div>
        {meta && <div className="mt-1 truncate text-[0.82rem] text-ink-400">{meta}</div>}
      </div>
    </Tag>
  );
}

export function Spinner({ text }) {
  return (
    <div className="flex flex-1 items-center justify-center gap-3 py-24 text-ink-400">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-ink-600 border-t-ink-100" /> {text}
    </div>
  );
}

// A list to pick one of, in the site's own panel (the browser's own list does not match it);
// up: it opens above (at the foot of a stage); a long one scrolls
export function Dropdown({ value, onChange, options, className = "", up = false, buttonClass = "" }) {
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
    <div ref={box} className={`relative ${className}`}>
      <button
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className={buttonClass || "flex h-10 min-w-[10rem] items-center gap-2 rounded-lg border border-white/[0.08] bg-ink-850 pr-3 pl-3.5 text-[0.88rem] text-ink-100 transition-colors hover:bg-ink-800"}
      >
        <span className="flex-1 truncate text-left">{current}</span>
        <ChevronDown size={15} className={`text-ink-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          className={`anim-open absolute z-30 max-h-80 min-w-full overflow-y-auto rounded-xl border border-white/[0.08] bg-ink-900 p-1.5 shadow-2xl shadow-black/60 ${
            up ? "bottom-full left-0 mb-2" : "top-full right-0 mt-2"
          }`}
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
