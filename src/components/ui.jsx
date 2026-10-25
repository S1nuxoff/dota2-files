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
